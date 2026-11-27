"""Ticket business logic. Views stay thin; every state change goes through here."""

from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from apps.ai import fallback
from apps.jobs import runner
from apps.realtime.broadcast import ticket_event
from apps.workspaces.models import Category, Workspace
from common.exceptions import DomainError

from .models import (
    ActivityAction,
    AIStatus,
    Attachment,
    ClassificationSource,
    MessageKind,
    Ticket,
    TicketActivity,
    TicketMessage,
    TicketPriority,
    TicketStatus,
)

ALLOWED_TRANSITIONS = {
    TicketStatus.OPEN: {TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED},
    TicketStatus.IN_PROGRESS: {TicketStatus.RESOLVED, TicketStatus.CLOSED},
    TicketStatus.RESOLVED: {TicketStatus.IN_PROGRESS, TicketStatus.CLOSED},
    TicketStatus.CLOSED: {TicketStatus.IN_PROGRESS},
}


def ai_active(workspace: Workspace) -> bool:
    return bool(settings.AI_ENABLED and workspace.ai_enabled)


def _log(ticket, action, actor=None, from_value="", to_value=""):
    TicketActivity.objects.create(
        ticket=ticket, actor=actor, action=action, from_value=str(from_value)[:100], to_value=str(to_value)[:100]
    )


def _enqueue(name: str, ticket: Ticket, **kwargs) -> None:
    runner.enqueue(name, ticket_id=ticket.pk, **kwargs)


def _label(category) -> str:
    return category.name if category else "Uncategorised"


# --- Creation ---------------------------------------------------------------


@transaction.atomic
def create_ticket(*, workspace: Workspace, requester, subject: str, description: str, record=None, files=()) -> Ticket:
    if record is not None and (record.workspace_id != workspace.id or record.owner_id != requester.id):
        raise DomainError("You can only raise tickets about your own items.", code="invalid_record", status_code=400)

    workspace = Workspace.objects.select_for_update().get(pk=workspace.pk)
    workspace.ticket_counter += 1
    workspace.save(update_fields=["ticket_counter"])

    guess = fallback.classify(workspace, subject, description)
    now = timezone.now()
    active = ai_active(workspace)
    ticket = Ticket(
        workspace=workspace,
        number=workspace.ticket_counter,
        requester=requester,
        record=record,
        subject=subject.strip(),
        description=description.strip(),
        category=guess.category,
        category_source=ClassificationSource.FALLBACK,
        priority_source=ClassificationSource.FALLBACK,
        ai_reasoning=guess.reasoning,
        ai_status=AIStatus.PENDING if active else AIStatus.DISABLED,
        ai_draft_status=AIStatus.PENDING if active else AIStatus.DISABLED,
        created_at=now,
        last_requester_activity_at=now,
        requester_last_seen_at=now,
    )
    ticket.set_priority(guess.priority)
    ticket.save()

    for f in files:
        Attachment.objects.create(
            ticket=ticket,
            uploaded_by=requester,
            file=f,
            original_name=f.name[:255],
            content_type=getattr(f, "content_type", "") or "application/octet-stream",
            size=f.size,
        )

    _log(ticket, ActivityAction.CREATED, actor=requester)
    if active:
        _enqueue("ai.classify", ticket, then_draft=True)
    ticket_event(ticket, "ticket.created", actor_id=requester.id)
    return ticket


# --- AI results --------------------------------------------------------------


@transaction.atomic
def apply_ai_classification(
    ticket: Ticket, *, category: Category | None, priority: str, confidence: float, reasoning: str,
    sentiment: str = "", summary: str = "",
) -> Ticket:
    """Store the AI suggestion; never overwrite a value staff have explicitly set."""
    ticket = Ticket.objects.select_for_update(of=("self",)).select_related("workspace").get(pk=ticket.pk)
    ticket.ai_category = category
    ticket.ai_priority = priority
    ticket.ai_confidence = confidence
    ticket.ai_reasoning = reasoning
    ticket.sentiment = sentiment
    ticket.ai_summary = summary
    ticket.ai_status = AIStatus.COMPLETED
    ticket.ai_error = ""
    if category and ticket.category_source != ClassificationSource.STAFF:
        ticket.category = category
        ticket.category_source = ClassificationSource.AI
    if ticket.priority_source != ClassificationSource.STAFF:
        ticket.set_priority(priority)
        ticket.priority_source = ClassificationSource.AI
    ticket.save()
    _log(ticket, ActivityAction.AI_CLASSIFIED, to_value=f"{_label(category)} / {TicketPriority(priority).label}")
    ticket_event(ticket, "ticket.updated", notify_requester=False)
    return ticket


def mark_ai_failed(ticket: Ticket, error: str) -> None:
    Ticket.objects.filter(pk=ticket.pk).update(
        ai_status=AIStatus.FAILED, ai_draft_status=AIStatus.FAILED, ai_error=error[:255]
    )
    _log(ticket, ActivityAction.AI_FAILED, to_value=error[:100])
    ticket.refresh_from_db()
    ticket_event(ticket, "ticket.updated", notify_requester=False)


def set_draft_status(ticket: Ticket, status: str, error: str = "") -> None:
    fields = {"ai_draft_status": status}
    if error:
        fields["ai_error"] = error[:255]
    Ticket.objects.filter(pk=ticket.pk).update(**fields)
    ticket.refresh_from_db()
    ticket_event(ticket, "ticket.updated", notify_requester=False)


def request_reclassification(ticket: Ticket) -> Ticket:
    if not ai_active(ticket.workspace):
        raise DomainError("AI is not enabled for this workspace.", code="ai_disabled", status_code=503)
    Ticket.objects.filter(pk=ticket.pk).update(ai_status=AIStatus.PENDING, ai_error="")
    ticket.refresh_from_db()
    _enqueue("ai.classify", ticket, then_draft=False)
    ticket_event(ticket, "ticket.updated", notify_requester=False)
    return ticket


def request_draft(ticket: Ticket, *, force: bool = False) -> Ticket:
    if not ai_active(ticket.workspace):
        raise DomainError("AI is not enabled for this workspace.", code="ai_disabled", status_code=503)
    Ticket.objects.filter(pk=ticket.pk).update(ai_draft_status=AIStatus.PENDING)
    ticket.refresh_from_db()
    _enqueue("ai.draft", ticket, force=force)
    return ticket


# --- Staff actions -----------------------------------------------------------


@transaction.atomic
def update_ticket(
    ticket: Ticket, actor, *, status=None, category=None, priority=None, assigned_to=...,
) -> Ticket:
    ticket = Ticket.objects.select_for_update(of=("self",)).select_related("requester", "workspace", "category").get(pk=ticket.pk)
    category_changed = False

    if category is not None:
        if category.pk != ticket.category_id:
            _log(ticket, ActivityAction.CATEGORY_CHANGED, actor, _label(ticket.category), category.name)
            ticket.category = category
            category_changed = True
        ticket.category_source = ClassificationSource.STAFF

    if priority:
        if priority != ticket.priority:
            _log(ticket, ActivityAction.PRIORITY_CHANGED, actor, TicketPriority(ticket.priority).label, TicketPriority(priority).label)
            ticket.set_priority(priority)
        ticket.priority_source = ClassificationSource.STAFF

    if assigned_to is not ...:
        if assigned_to != ticket.assigned_to:
            _log(
                ticket,
                ActivityAction.ASSIGNED,
                actor,
                ticket.assigned_to.full_name if ticket.assigned_to else "Unassigned",
                assigned_to.full_name if assigned_to else "Unassigned",
            )
            ticket.assigned_to = assigned_to

    if status and status != ticket.status:
        _transition(ticket, status, actor)

    ticket.save()
    if category_changed and ai_active(ticket.workspace):
        Ticket.objects.filter(pk=ticket.pk).update(ai_draft_status=AIStatus.PENDING)
        ticket.ai_draft_status = AIStatus.PENDING
        _enqueue("ai.draft", ticket)
    ticket_event(ticket, "ticket.updated", actor_id=actor.id)
    return ticket


def _transition(ticket: Ticket, new_status: str, actor) -> None:
    if new_status not in ALLOWED_TRANSITIONS[ticket.status]:
        raise DomainError(
            f"A ticket cannot move from {TicketStatus(ticket.status).label} to {TicketStatus(new_status).label}.",
            code="invalid_transition",
        )
    _log(ticket, ActivityAction.STATUS_CHANGED, actor, TicketStatus(ticket.status).label, TicketStatus(new_status).label)
    now = timezone.now()
    if new_status == TicketStatus.RESOLVED:
        ticket.resolved_at = now
    elif new_status == TicketStatus.CLOSED:
        ticket.closed_at = now
        ticket.resolved_at = ticket.resolved_at or now
    elif new_status == TicketStatus.IN_PROGRESS:
        ticket.resolved_at = None
        ticket.closed_at = None
    ticket.status = new_status


@transaction.atomic
def post_staff_message(ticket: Ticket, staff, *, body: str, kind: str, ai_draft=None, resolve: bool = False) -> TicketMessage:
    ticket = Ticket.objects.select_for_update(of=("self",)).select_related("requester", "workspace").get(pk=ticket.pk)
    now = timezone.now()

    if kind == MessageKind.NOTE:
        message = TicketMessage.objects.create(ticket=ticket, sender=staff, kind=MessageKind.NOTE, body=body, created_at=now)
        _log(ticket, ActivityAction.NOTE_ADDED, staff)
        ticket.save(update_fields=["updated_at"])
        ticket_event(ticket, "note.created", notify_requester=False, actor_id=staff.id)
        return message

    if ticket.status == TicketStatus.CLOSED:
        raise DomainError("This ticket is closed. Reopen it before replying.", code="ticket_closed")

    message = TicketMessage.objects.create(
        ticket=ticket,
        sender=staff,
        kind=MessageKind.REPLY,
        body=body,
        ai_draft=ai_draft,
        ai_draft_edited=bool(ai_draft and ai_draft.content.strip() != body.strip()),
        created_at=now,
    )
    _log(ticket, ActivityAction.REPLIED, staff)
    ticket.first_response_at = ticket.first_response_at or now
    ticket.last_staff_reply_at = now
    ticket.staff_last_seen_at = now
    if ticket.assigned_to_id is None:
        _log(ticket, ActivityAction.ASSIGNED, staff, "Unassigned", staff.full_name)
        ticket.assigned_to = staff
    if resolve:
        _transition(ticket, TicketStatus.RESOLVED, staff)
    elif ticket.status in (TicketStatus.OPEN, TicketStatus.RESOLVED):
        _transition(ticket, TicketStatus.IN_PROGRESS, staff)
    ticket.save()
    ticket_event(ticket, "message.created", actor_id=staff.id)
    return message


# --- Requester actions -------------------------------------------------------


@transaction.atomic
def post_requester_message(ticket: Ticket, requester, *, body: str) -> TicketMessage:
    ticket = Ticket.objects.select_for_update(of=("self",)).select_related("requester", "workspace").get(pk=ticket.pk)
    now = timezone.now()
    message = TicketMessage.objects.create(ticket=ticket, sender=requester, kind=MessageKind.REPLY, body=body, created_at=now)
    _log(ticket, ActivityAction.REQUESTER_REPLIED, requester)
    if ticket.status in (TicketStatus.RESOLVED, TicketStatus.CLOSED):
        _transition(ticket, TicketStatus.IN_PROGRESS, requester)
    ticket.last_requester_activity_at = now
    ticket.requester_last_seen_at = now
    active = ai_active(ticket.workspace)
    if active:
        ticket.ai_draft_status = AIStatus.PENDING
    ticket.save()
    if active:
        _enqueue("ai.draft", ticket)
    ticket_event(ticket, "message.created", actor_id=requester.id)
    return message


@transaction.atomic
def confirm_resolution(ticket: Ticket, requester, *, resolved: bool, message: str = "") -> Ticket:
    ticket = Ticket.objects.select_for_update(of=("self",)).select_related("requester", "workspace").get(pk=ticket.pk)
    if resolved:
        if ticket.status == TicketStatus.CLOSED:
            raise DomainError("This ticket is already closed.", code="invalid_transition")
        _log(ticket, ActivityAction.REQUESTER_CONFIRMED, requester)
        _transition(ticket, TicketStatus.CLOSED, requester)
        ticket.save()
        ticket_event(ticket, "ticket.updated", actor_id=requester.id)
        return ticket

    if ticket.status != TicketStatus.RESOLVED:
        raise DomainError("Only resolved tickets can be reopened.", code="invalid_transition")
    _log(ticket, ActivityAction.REQUESTER_REOPENED, requester)
    ticket.save()
    body = message.strip() or "I still need help with this issue."
    post_requester_message(ticket, requester, body=body)
    ticket.refresh_from_db()
    return ticket


@transaction.atomic
def submit_csat(ticket: Ticket, requester, *, score: int, comment: str = "") -> Ticket:
    if ticket.status not in (TicketStatus.RESOLVED, TicketStatus.CLOSED):
        raise DomainError("You can rate a ticket once it is resolved.", code="invalid_transition")
    Ticket.objects.filter(pk=ticket.pk).update(csat_score=score, csat_comment=comment[:500])
    ticket.refresh_from_db()
    _log(ticket, ActivityAction.CSAT_RECEIVED, requester, to_value=f"{score}/5")
    ticket_event(ticket, "ticket.updated", actor_id=requester.id)
    return ticket


def mark_seen(ticket: Ticket, *, staff: bool) -> None:
    field = "staff_last_seen_at" if staff else "requester_last_seen_at"
    Ticket.objects.filter(pk=ticket.pk).update(**{field: timezone.now()})


# --------------------------------------------------------------------------- auto-close

AUTO_CLOSE_BATCH = 200
AUTO_CLOSE_EVERY = 3600  # seconds between sweeps for one workspace


@transaction.atomic
def release_assigned(workspace: Workspace, user) -> int:
    """Hand a leaving teammate's unfinished tickets back to the queue (unassigned). Returns how many were released."""
    tickets = Ticket.objects.select_for_update(of=("self",)).filter(workspace=workspace, assigned_to=user, status__in=Ticket.ACTIVE_STATUSES)
    count = 0
    for ticket in tickets:
        _log(ticket, ActivityAction.ASSIGNED, None, user.full_name, "Unassigned")
        ticket.assigned_to = None
        ticket.save(update_fields=["assigned_to"])
        ticket_event(ticket, "ticket.updated", actor_id=None)
        count += 1
    return count


def auto_close_resolved(workspace: Workspace | None = None, *, now=None) -> int:
    """Close Resolved tickets that have waited out their workspace's auto-close period.

    A customer reply moves a ticket back to In progress, so a ticket that is still Resolved after N days is by
    definition one the customer never answered. Returns how many tickets were closed.
    """
    now = now or timezone.now()
    workspaces = [workspace] if workspace else list(Workspace.objects.filter(auto_close_days__gt=0))
    closed = 0
    for ws in workspaces:
        if not ws.auto_close_days:
            continue
        cutoff = now - timedelta(days=ws.auto_close_days)
        due = Ticket.objects.filter(workspace=ws, status=TicketStatus.RESOLVED, resolved_at__lte=cutoff)
        for pk in list(due.values_list("pk", flat=True)[:AUTO_CLOSE_BATCH]):
            closed += _auto_close_one(pk, ws.auto_close_days, now)
    return closed


@transaction.atomic
def _auto_close_one(ticket_id: int, days: int, now) -> int:
    ticket = Ticket.objects.select_for_update(of=("self",), skip_locked=True).filter(pk=ticket_id).first()
    if ticket is None or ticket.status != TicketStatus.RESOLVED:
        return 0  # taken by someone else, or the customer replied in the meantime
    _log(ticket, ActivityAction.AUTO_CLOSED, None, TicketStatus.RESOLVED.label, f"Closed after {days} days")
    ticket.status = TicketStatus.CLOSED
    ticket.closed_at = now
    ticket.resolved_at = ticket.resolved_at or now
    ticket.save()
    ticket_event(ticket, "ticket.updated", actor_id=None)
    return 1


def schedule_auto_close(workspace: Workspace, *, force: bool = False) -> None:
    """Queue an auto-close pass for a workspace, at most once an hour unless `force` (used when the setting changes).

    Called when staff load the queue, so an active workspace tidies itself without a scheduler or a worker process.
    """
    if not workspace.auto_close_days:
        return
    key = f"auto-close:{workspace.pk}"
    if force:
        cache.set(key, 1, AUTO_CLOSE_EVERY)
    elif not cache.add(key, 1, AUTO_CLOSE_EVERY):
        return
    runner.enqueue("tickets.auto_close", workspace_id=workspace.pk)
