from django.urls import path

from .consumers import TicketEventsConsumer

websocket_urlpatterns = [
    path("ws/events/", TicketEventsConsumer.as_asgi()),
]
