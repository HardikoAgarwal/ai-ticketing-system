"""Per-user notification feed.

Derived from the read-state already tracked on each ticket (``*_last_seen_at`` vs. the latest
activity from the other side), so there is no separate table to keep in sync: opening a ticket
clears its notification.

Requesters see new staff replies and resolved tickets awaiting their confirmation. Staff see new
tickets and requester replies on tickets assigned to them or still unassigned; tickets owned by
someone else stay out of their feed to keep it actionable.
"""

from django.db.models import OuterRef, Q, Subquery
from django.utils import timezone

from .models import MessageKind, Ticket, TicketMessage, TicketStatus
from .selectors import requester_replied_exists, tickets_visible_to, unread_for_requester_q, unread_for_staff_q

FEED_LIMIT = 20
PREVIEW_CHARS = 140
RESOLVED_PREVIEW = "Our team marked this as resolved. Let us know if it's sorted."


def _latest_reply_body(*, from_requester: bool) -> Subquery:
    qs = TicketMessage.objects.filter(ticket=OuterRef("pk"), kind=MessageKind.REPLY)
    qs = qs.filter(sender_id=OuterRef("requester_id")) if from_requester else qs.exclude(sender_id=OuterRef("requester_id"))
    return Subquery(qs.order_by("-created_at").values("body")[:1])


def _preview(text: str | None) -> str:
    text = " ".join((text or "").split())
    return text if len(text) <= PREVIEW_CHARS else text[: PREVIEW_CHARS - 1].rstrip() + "…"


def _item(ticket: Ticket, kind: str, at, preview: str | None, actor_name: str) -> dict:
    return {
        "id": f"{kind}:{ticket.pk}:{int(at.timestamp()) if at else 0}",
        "kind": kind,
        "ticket_id": ticket.pk,
        "reference": ticket.reference,
        "subject": ticket.subject,
        "preview": _preview(preview),
        "actor_name": actor_name,
        "at": at,
    }


def _staff_scope(user) -> Q:
    return Q(assigned_to=user) | Q(assigned_to__isnull=True)


def _staff_feed(request) -> dict:
    user = request.user
    unread = tickets_visible_to(request).filter(_staff_scope(user), unread_for_staff_q())
    rows = unread.annotate(
        latest_requester_reply=_latest_reply_body(from_requester=True), requester_replied=requester_replied_exists()
    ).order_by("-last_requester_activity_at")
    items = []
    for t in rows[:FEED_LIMIT]:
        is_new = not t.requester_replied
        item = _item(
            t,
            "new_ticket" if is_new else "requester_reply",
            t.last_requester_activity_at,
            t.description if is_new else t.latest_requester_reply,
            t.requester.full_name,
        )
        item["priority"] = t.priority
        item["owner"] = "you" if t.assigned_to_id == user.id else "unassigned"
        items.append(item)
    return {"count": unread.count(), "items": items}


def _requester_feed(request) -> dict:
    team = request.workspace.agent_title
    mine = tickets_visible_to(request)
    replies = mine.filter(unread_for_requester_q()).annotate(latest_staff_reply=_latest_reply_body(from_requester=False))
    awaiting = mine.filter(status=TicketStatus.RESOLVED).exclude(unread_for_requester_q())
    items = [_item(t, "staff_reply", t.last_staff_reply_at, t.latest_staff_reply, team) for t in replies[:FEED_LIMIT]]
    items += [_item(t, "resolved", t.resolved_at, RESOLVED_PREVIEW, team) for t in awaiting[:FEED_LIMIT]]
    epoch = timezone.now().replace(year=2000)
    items.sort(key=lambda i: i["at"] or epoch, reverse=True)
    return {"count": replies.count() + awaiting.count(), "items": items[:FEED_LIMIT]}


def notification_feed(request) -> dict:
    return _staff_feed(request) if request.membership.is_staff_member else _requester_feed(request)


def mark_all_read(request) -> int:
    """Clears unread replies. Resolved tickets stay in a requester's feed until they confirm."""
    now = timezone.now()
    if request.membership.is_staff_member:
        qs = tickets_visible_to(request).filter(_staff_scope(request.user), unread_for_staff_q())
        return Ticket.objects.filter(pk__in=qs.values("pk")).update(staff_last_seen_at=now)
    qs = tickets_visible_to(request).filter(unread_for_requester_q())
    return Ticket.objects.filter(pk__in=qs.values("pk")).update(requester_last_seen_at=now)
