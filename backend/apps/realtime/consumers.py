from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .groups import ADMINS_GROUP, author_group


class TicketEventsConsumer(AsyncJsonWebsocketConsumer):
    """Each user joins exactly one group: all admins share one, each author has their own."""

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return
        self.group = ADMINS_GROUP if user.is_admin else author_group(user.id)
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()
        await self.send_json({"event": "connected", "role": user.role})

    async def disconnect(self, code):
        if hasattr(self, "group"):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "ping":
            await self.send_json({"event": "pong"})

    async def ticket_event(self, message):
        await self.send_json(message["payload"])
