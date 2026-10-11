"""Push ticket events to connected clients.

Events are intentionally small notifications ("ticket X changed"); clients
refetch through the REST API, which keeps RBAC enforced in one place.
Internal notes and triage data are never sent to author groups.
"""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

from .groups import ADMINS_GROUP, author_group

logger = logging.getLogger(__name__)


def _send(group: str, payload: dict) -> None:
    layer = get_channel_layer()
    if layer is None:
        return
    try:
        async_to_sync(layer.group_send)(group, {"type": "ticket.event", "payload": payload})
    except Exception:  # Real-time is best-effort; clients also poll as a fallback.
        logger.warning("Realtime broadcast to %s failed", group, exc_info=True)


def _admin_summary(ticket) -> dict:
    return {
        "id": ticket.id,
        "reference": ticket.reference,
        "subject": ticket.subject,
        "status": ticket.status,
        "priority": ticket.priority,
        "category": ticket.category,
        "author_name": ticket.author.user.full_name,
        "assigned_to": ticket.assigned_to_id,
    }


def ticket_event(ticket, event: str, *, notify_author: bool = True, actor_id: int | None = None) -> None:
    """event: ticket.created | ticket.updated | message.created | note.created"""

    def send():
        _send(
            ADMINS_GROUP,
            {
                "event": event,
                "ticket": _admin_summary(ticket),
                "actor_id": actor_id,
                "by_author": actor_id is not None and actor_id == ticket.author.user_id,
            },
        )
        if notify_author:
            _send(
                author_group(ticket.author.user_id),
                {
                    "event": event,
                    "ticket": {"id": ticket.id, "reference": ticket.reference, "status": ticket.status, "subject": ticket.subject},
                    "actor_id": actor_id,
                },
            )

    transaction.on_commit(send)
