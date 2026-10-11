"""Per-user notification feed.

Derived from the read-state already tracked on each ticket (``*_last_seen_at`` vs.
the latest activity from the other side), so there is no separate table to keep in
sync: opening a ticket clears its notification.

Authors see new replies from BookLeaf and resolved tickets awaiting their
confirmation. Admins see new tickets and author replies on tickets that are
assigned to them or still unassigned; tickets owned by another agent stay out of
their feed to keep it actionable.
"""

from django.db.models import OuterRef, Q, Subquery
from django.utils import timezone

from apps.accounts.models import User

from .models import MessageKind, Ticket, TicketMessage, TicketStatus
from .selectors import author_replied_exists, tickets_visible_to, unread_for_admin_q, unread_for_author_q

FEED_LIMIT = 20
PREVIEW_CHARS = 140
RESOLVED_PREVIEW = "Our team marked this as resolved. Let us know if it's sorted."


def _latest_reply_body(role: str) -> Subquery:
    return Subquery(
        TicketMessage.objects.filter(ticket=OuterRef("pk"), kind=MessageKind.REPLY, sender__role=role)
        .order_by("-created_at")
        .values("body")[:1]
    )


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


def _admin_scope(user) -> Q:
    return Q(assigned_to=user) | Q(assigned_to__isnull=True)


def _admin_feed(user) -> dict:
    unread = tickets_visible_to(user).filter(_admin_scope(user), unread_for_admin_q())
    rows = unread.annotate(
        latest_author_reply=_latest_reply_body(User.Role.AUTHOR), author_replied=author_replied_exists()
    ).order_by("-last_author_activity_at")
    items = []
    for t in rows[:FEED_LIMIT]:
        is_new = not t.author_replied
        item = _item(
            t,
            "new_ticket" if is_new else "author_reply",
            t.last_author_activity_at,
            t.description if is_new else t.latest_author_reply,
            t.author.user.full_name,
        )
        item["priority"] = t.priority
        item["owner"] = "you" if t.assigned_to_id == user.id else "unassigned"
        items.append(item)
    return {"count": unread.count(), "items": items}


def _author_feed(user) -> dict:
    mine = tickets_visible_to(user)
    replies = mine.filter(unread_for_author_q()).annotate(latest_admin_reply=_latest_reply_body(User.Role.ADMIN))
    awaiting = mine.filter(status=TicketStatus.RESOLVED).exclude(unread_for_author_q())
    items = [_item(t, "admin_reply", t.last_admin_reply_at, t.latest_admin_reply, "BookLeaf Support") for t in replies[:FEED_LIMIT]]
    items += [_item(t, "resolved", t.resolved_at, RESOLVED_PREVIEW, "BookLeaf Support") for t in awaiting[:FEED_LIMIT]]
    epoch = timezone.now().replace(year=2000)
    items.sort(key=lambda i: i["at"] or epoch, reverse=True)
    return {"count": replies.count() + awaiting.count(), "items": items[:FEED_LIMIT]}


def notification_feed(user) -> dict:
    return _admin_feed(user) if user.is_admin else _author_feed(user)


def mark_all_read(user) -> int:
    """Clears unread replies. Resolved tickets stay in an author's feed until they confirm."""
    now = timezone.now()
    if user.is_admin:
        qs = tickets_visible_to(user).filter(_admin_scope(user), unread_for_admin_q())
        return Ticket.objects.filter(pk__in=qs.values("pk")).update(admin_last_seen_at=now)
    qs = tickets_visible_to(user).filter(unread_for_author_q())
    return Ticket.objects.filter(pk__in=qs.values("pk")).update(author_last_seen_at=now)
