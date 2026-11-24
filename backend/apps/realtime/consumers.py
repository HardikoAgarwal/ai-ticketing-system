import asyncio

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.workspaces.models import Membership, STAFF_ROLES

from . import broadcast
from .groups import staff_group, user_group


@database_sync_to_async
def _membership(user, slug):
    return Membership.objects.filter(user=user, workspace__slug=slug).select_related("workspace").first()


class TicketEventsConsumer(AsyncJsonWebsocketConsumer):
    """Connect with ?token=<jwt>&workspace=<slug>. Staff share one group; requesters get their own."""

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return
        slug = (self.scope.get("query_string", b"").decode().split("workspace=") + [""])[1].split("&")[0]
        membership = await _membership(user, slug) if slug else None
        if membership is None:
            await self.close(code=4403)
            return
        broadcast.register_loop(asyncio.get_running_loop())
        ws_id = membership.workspace_id
        self.group = staff_group(ws_id) if membership.role in STAFF_ROLES else user_group(ws_id, user.id)
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()
        await self.send_json({"event": "connected", "role": membership.role})

    async def disconnect(self, code):
        if hasattr(self, "group"):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "ping":
            await self.send_json({"event": "pong"})

    async def ticket_event(self, message):
        await self.send_json(message["payload"])
