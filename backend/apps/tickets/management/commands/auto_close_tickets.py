from django.core.management.base import BaseCommand

from apps.tickets.services import auto_close_resolved


class Command(BaseCommand):
    help = "Close Resolved tickets that have waited out their workspace's auto-close period."

    def handle(self, *args, **options):
        closed = auto_close_resolved()
        self.stdout.write(f"Closed {closed} resolved ticket(s).")
