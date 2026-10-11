"""Ticket business logic. Views stay thin; every state change goes through here."""

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.ai import fallback
from apps.realtime.broadcast import ticket_event
from common.exceptions import DomainError

from .models import (
    ActivityAction,
    AIStatus,
    Attachment,
    ClassificationSource,
    MessageKind,
    Ticket,
    TicketActivity,
    TicketCategory,
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


def _log(ticket, action, actor=None, from_value="", to_value=""):
    TicketActivity.objects.create(
        ticket=ticket, actor=actor, action=action, from_value=str(from_value)[:100], to_value=str(to_value)[:100]
    )


def _enqueue(fn_name: str, ticket: Ticket, **kwargs) -> None:
    from apps.ai import tasks

    transaction.on_commit(lambda: getattr(tasks, fn_name)(ticket.id, **kwargs))


# --- Creation ---------------------------------------------------------------


@transaction.atomic
def create_ticket(*, author_user, subject: str, description: str, book=None, files=()) -> Ticket:
    profile = author_user.author_profile
    if book is not None and book.author_id != profile.id:
        raise DomainError("You can only raise tickets about your own books.", code="invalid_book", status_code=400)

    guess = fallback.classify(subject, description)
    now = timezone.now()
    ticket = Ticket(
        author=profile,
        book=book,
        subject=subject.strip(),
        description=description.strip(),
        category=guess.category,
        category_source=ClassificationSource.FALLBACK,
        priority_source=ClassificationSource.FALLBACK,
        ai_reasoning=guess.reasoning,
        ai_status=AIStatus.PENDING if settings.AI_ENABLED else AIStatus.DISABLED,
        ai_draft_status=AIStatus.PENDING if settings.AI_ENABLED else AIStatus.DISABLED,
        created_at=now,
        last_author_activity_at=now,
        author_last_seen_at=now,
    )
    ticket.set_priority(guess.priority)
    ticket.save()

    for f in files:
        Attachment.objects.create(
            ticket=ticket,
            uploaded_by=author_user,
            file=f,
            original_name=f.name[:255],
            content_type=getattr(f, "content_type", "") or "application/octet-stream",
            size=f.size,
        )

    _log(ticket, ActivityAction.CREATED, actor=author_user)
    if settings.AI_ENABLED:
        _enqueue("enqueue_ticket_pipeline", ticket)
    ticket_event(ticket, "ticket.created", actor_id=author_user.id)
    return ticket


# --- AI results --------------------------------------------------------------


@transaction.atomic
def apply_ai_classification(ticket: Ticket, *, category: str, priority: str, confidence: float, reasoning: str) -> Ticket:
    """Store the AI suggestion; never overwrite a value an admin has explicitly set."""
    ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
    ticket.ai_category = category
    ticket.ai_priority = priority
    ticket.ai_confidence = confidence
    ticket.ai_reasoning = reasoning
    ticket.ai_status = AIStatus.COMPLETED
    ticket.ai_error = ""
    if ticket.category_source != ClassificationSource.ADMIN:
        ticket.category = category
        ticket.category_source = ClassificationSource.AI
    if ticket.priority_source != ClassificationSource.ADMIN:
        ticket.set_priority(priority)
        ticket.priority_source = ClassificationSource.AI
    ticket.save()
    _log(
        ticket,
        ActivityAction.AI_CLASSIFIED,
        to_value=f"{TicketCategory(category).label} / {TicketPriority(priority).label}",
    )
    ticket_event(ticket, "ticket.updated", notify_author=False)
    return ticket


def mark_ai_failed(ticket: Ticket, error: str) -> None:
    Ticket.objects.filter(pk=ticket.pk).update(
        ai_status=AIStatus.FAILED, ai_draft_status=AIStatus.FAILED, ai_error=error[:255]
    )
    _log(ticket, ActivityAction.AI_FAILED, to_value=error[:100])
    ticket.refresh_from_db()
    ticket_event(ticket, "ticket.updated", notify_author=False)


def set_draft_status(ticket: Ticket, status: str, error: str = "") -> None:
    fields = {"ai_draft_status": status}
    if error:
        fields["ai_error"] = error[:255]
    Ticket.objects.filter(pk=ticket.pk).update(**fields)
    ticket.refresh_from_db()
    ticket_event(ticket, "ticket.updated", notify_author=False)


def request_reclassification(ticket: Ticket) -> Ticket:
    if not settings.AI_ENABLED:
        raise DomainError("AI is not configured on this server.", code="ai_disabled", status_code=503)
    Ticket.objects.filter(pk=ticket.pk).update(ai_status=AIStatus.PENDING, ai_error="")
    ticket.refresh_from_db()
    _enqueue("enqueue_classification", ticket)
    ticket_event(ticket, "ticket.updated", notify_author=False)
    return ticket


def request_draft(ticket: Ticket, *, force: bool = False) -> Ticket:
    if not settings.AI_ENABLED:
        raise DomainError("AI is not configured on this server.", code="ai_disabled", status_code=503)
    Ticket.objects.filter(pk=ticket.pk).update(ai_draft_status=AIStatus.PENDING)
    ticket.refresh_from_db()
    _enqueue("enqueue_draft", ticket, force=force)
    return ticket


# --- Admin actions -----------------------------------------------------------


@transaction.atomic
def update_ticket(ticket: Ticket, actor, *, status=None, category=None, priority=None, assigned_to=..., ) -> Ticket:
    ticket = Ticket.objects.select_for_update().select_related("author__user").get(pk=ticket.pk)
    category_changed = False

    if category and category != ticket.category:
        _log(ticket, ActivityAction.CATEGORY_CHANGED, actor, TicketCategory(ticket.category).label, TicketCategory(category).label)
        ticket.category = category
        category_changed = True
    if category:
        ticket.category_source = ClassificationSource.ADMIN

    if priority and priority != ticket.priority:
        _log(ticket, ActivityAction.PRIORITY_CHANGED, actor, TicketPriority(ticket.priority).label, TicketPriority(priority).label)
        ticket.set_priority(priority)
    if priority:
        ticket.priority_source = ClassificationSource.ADMIN

    if assigned_to is not ...:
        if assigned_to is not None and not assigned_to.is_admin:
            raise DomainError("Tickets can only be assigned to BookLeaf team members.", code="invalid_assignee", status_code=400)
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
    if category_changed and settings.AI_ENABLED:
        Ticket.objects.filter(pk=ticket.pk).update(ai_draft_status=AIStatus.PENDING)
        ticket.ai_draft_status = AIStatus.PENDING
        _enqueue("enqueue_draft", ticket)
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
def post_admin_message(ticket: Ticket, admin, *, body: str, kind: str, ai_draft=None, resolve: bool = False) -> TicketMessage:
    ticket = Ticket.objects.select_for_update().select_related("author__user").get(pk=ticket.pk)
    now = timezone.now()

    if kind == MessageKind.NOTE:
        message = TicketMessage.objects.create(ticket=ticket, sender=admin, kind=MessageKind.NOTE, body=body, created_at=now)
        _log(ticket, ActivityAction.NOTE_ADDED, admin)
        ticket.save(update_fields=["updated_at"])
        ticket_event(ticket, "note.created", notify_author=False, actor_id=admin.id)
        return message

    if ticket.status == TicketStatus.CLOSED:
        raise DomainError("This ticket is closed. Reopen it before replying.", code="ticket_closed")

    message = TicketMessage.objects.create(
        ticket=ticket,
        sender=admin,
        kind=MessageKind.REPLY,
        body=body,
        ai_draft=ai_draft,
        ai_draft_edited=bool(ai_draft and ai_draft.content.strip() != body.strip()),
        created_at=now,
    )
    _log(ticket, ActivityAction.REPLIED, admin)
    ticket.first_response_at = ticket.first_response_at or now
    ticket.last_admin_reply_at = now
    ticket.admin_last_seen_at = now
    if ticket.assigned_to_id is None:
        _log(ticket, ActivityAction.ASSIGNED, admin, "Unassigned", admin.full_name)
        ticket.assigned_to = admin
    if resolve:
        _transition(ticket, TicketStatus.RESOLVED, admin)
    elif ticket.status in (TicketStatus.OPEN, TicketStatus.RESOLVED):
        _transition(ticket, TicketStatus.IN_PROGRESS, admin)
    ticket.save()
    ticket_event(ticket, "message.created", actor_id=admin.id)
    return message


# --- Author actions ----------------------------------------------------------


@transaction.atomic
def post_author_message(ticket: Ticket, author_user, *, body: str) -> TicketMessage:
    ticket = Ticket.objects.select_for_update().select_related("author__user").get(pk=ticket.pk)
    now = timezone.now()
    message = TicketMessage.objects.create(ticket=ticket, sender=author_user, kind=MessageKind.REPLY, body=body, created_at=now)
    _log(ticket, ActivityAction.AUTHOR_REPLIED, author_user)
    if ticket.status in (TicketStatus.RESOLVED, TicketStatus.CLOSED):
        _transition(ticket, TicketStatus.IN_PROGRESS, author_user)
    ticket.last_author_activity_at = now
    ticket.author_last_seen_at = now
    if settings.AI_ENABLED:
        ticket.ai_draft_status = AIStatus.PENDING
    ticket.save()
    if settings.AI_ENABLED:
        _enqueue("enqueue_draft", ticket)
    ticket_event(ticket, "message.created", actor_id=author_user.id)
    return message


@transaction.atomic
def confirm_resolution(ticket: Ticket, author_user, *, resolved: bool, message: str = "") -> Ticket:
    ticket = Ticket.objects.select_for_update().select_related("author__user").get(pk=ticket.pk)
    if ticket.status != TicketStatus.RESOLVED:
        raise DomainError("Only resolved tickets can be confirmed or reopened.", code="invalid_transition")
    if resolved:
        _log(ticket, ActivityAction.AUTHOR_CONFIRMED, author_user)
        _transition(ticket, TicketStatus.CLOSED, author_user)
        ticket.save()
        ticket_event(ticket, "ticket.updated", actor_id=author_user.id)
        return ticket

    _log(ticket, ActivityAction.AUTHOR_REOPENED, author_user)
    ticket.save()
    body = message.strip() or "I still need help with this issue."
    post_author_message(ticket, author_user, body=body)
    ticket.refresh_from_db()
    return ticket


def mark_seen(ticket: Ticket, user) -> None:
    field = "admin_last_seen_at" if user.is_admin else "author_last_seen_at"
    Ticket.objects.filter(pk=ticket.pk).update(**{field: timezone.now()})
