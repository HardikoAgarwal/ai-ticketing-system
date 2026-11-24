from django.db.models import Exists, F, OuterRef, Q, QuerySet

from .models import MessageKind, Ticket, TicketMessage


def requester_replied_exists() -> Exists:
    """True once the requester has posted a follow-up beyond the original request."""
    return Exists(
        TicketMessage.objects.filter(ticket=OuterRef("pk"), kind=MessageKind.REPLY, sender_id=OuterRef("requester_id"))
    )


def unread_for_requester_q() -> Q:
    return Q(last_staff_reply_at__isnull=False) & (
        Q(requester_last_seen_at__isnull=True) | Q(requester_last_seen_at__lt=F("last_staff_reply_at"))
    )


def unread_for_staff_q() -> Q:
    return Q(last_requester_activity_at__isnull=False) & (
        Q(staff_last_seen_at__isnull=True) | Q(staff_last_seen_at__lt=F("last_requester_activity_at"))
    )


def tickets_visible_to(request) -> QuerySet[Ticket]:
    """Tickets of the request's workspace; requesters only ever see their own."""
    qs = Ticket.objects.filter(workspace=request.workspace).select_related(
        "requester", "record", "assigned_to", "category", "ai_category", "workspace"
    )
    if request.membership.is_staff_member:
        return qs
    return qs.filter(requester=request.user)
