from django.db.models import F, Q, QuerySet

from .models import Ticket


def unread_for_author_q() -> Q:
    return Q(last_admin_reply_at__isnull=False) & (
        Q(author_last_seen_at__isnull=True) | Q(author_last_seen_at__lt=F("last_admin_reply_at"))
    )


def unread_for_admin_q() -> Q:
    return Q(last_author_activity_at__isnull=False) & (
        Q(admin_last_seen_at__isnull=True) | Q(admin_last_seen_at__lt=F("last_author_activity_at"))
    )


def tickets_visible_to(user) -> QuerySet[Ticket]:
    qs = Ticket.objects.select_related("author__user", "book", "assigned_to")
    if not user.is_authenticated:
        return qs.none()
    if user.is_admin:
        return qs
    return qs.filter(author__user=user)
