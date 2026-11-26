from django.apps import AppConfig


class TicketsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.tickets"
    label = "tickets"

    def ready(self):
        from . import tasks  # noqa: F401  registers job handlers
