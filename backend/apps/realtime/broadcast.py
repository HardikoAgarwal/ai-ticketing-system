"""Push ticket events to connected clients.

Events are intentionally small notifications ("ticket X changed"); clients refetch through the
REST API, which keeps RBAC enforced in one place. Internal notes and triage data are never sent
to requester groups.

Single-process deployment: events may originate on a request thread (async_to_sync works) or on a
job-pool thread. For the latter we hop onto the server's event loop, registered by the consumer.
"""

import asyncio
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

from .groups import staff_group, user_group

logger = logging.getLogger(__name__)

_server_loop: asyncio.AbstractEventLoop | None = None


def register_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _server_loop
    _server_loop = loop


def _send(group: str, payload: dict) -> None:
    layer = get_channel_layer()
    if layer is None:
        return
    message = {"type": "ticket.event", "payload": payload}
    try:
        if _server_loop is not None and _server_loop.is_running():
            try:
                asyncio.get_running_loop()
                on_server_loop = True
            except RuntimeError:
                on_server_loop = False
            if not on_server_loop:
                asyncio.run_coroutine_threadsafe(layer.group_send(group, message), _server_loop)
                return
        async_to_sync(layer.group_send)(group, message)
    except Exception:  # Real-time is best-effort; clients also poll as a fallback.
        logger.warning("Realtime broadcast to %s failed", group, exc_info=True)


def _staff_summary(ticket) -> dict:
    return {
        "id": ticket.id,
        "reference": ticket.reference,
        "subject": ticket.subject,
        "status": ticket.status,
        "priority": ticket.priority,
        "category": ticket.category.name if ticket.category_id else None,
        "requester_name": ticket.requester.full_name,
        "assigned_to": ticket.assigned_to_id,
    }


def ticket_event(ticket, event: str, *, notify_requester: bool = True, actor_id: int | None = None) -> None:
    """event: ticket.created | ticket.updated | message.created | note.created"""
    workspace_id = ticket.workspace_id

    def send():
        _send(
            staff_group(workspace_id),
            {
                "event": event,
                "ticket": _staff_summary(ticket),
                "actor_id": actor_id,
                "by_requester": actor_id is not None and actor_id == ticket.requester_id,
            },
        )
        if notify_requester:
            _send(
                user_group(workspace_id, ticket.requester_id),
                {
                    "event": event,
                    "ticket": {"id": ticket.id, "reference": ticket.reference, "status": ticket.status, "subject": ticket.subject},
                    "actor_id": actor_id,
                },
            )

    transaction.on_commit(send)
