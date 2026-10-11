"""Queue AI classification (and drafts for active tickets) for tickets created while AI was off or failing."""

import time

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.tickets import services
from apps.tickets.models import AIStatus, Ticket, TicketStatus

STALE = (AIStatus.DISABLED, AIStatus.FAILED)
ACTIVE = (TicketStatus.OPEN, TicketStatus.IN_PROGRESS)


class Command(BaseCommand):
    help = "Run the AI pipeline on tickets whose classification or draft is DISABLED/FAILED. Admin overrides are kept."

    def add_arguments(self, parser):
        parser.add_argument(
            "--pace", type=float, default=8.0,
            help="Seconds between tickets, to stay under free-tier rate limits (default 8).",
        )

    def handle(self, *args, pace, **options):
        if not settings.AI_ENABLED:
            raise CommandError("AI is not configured (set OPENAI_API_KEY).")

        tickets = Ticket.objects.filter(ai_status__in=STALE) | Ticket.objects.filter(
            status__in=ACTIVE, ai_draft_status__in=STALE
        )
        classified = drafted = 0
        for i, ticket in enumerate(tickets.distinct().order_by("pk")):
            if i:
                time.sleep(pace)
            if ticket.ai_status in STALE:
                services.request_reclassification(ticket)
                classified += 1
            if ticket.status in ACTIVE and ticket.ai_draft_status in STALE:
                services.request_draft(ticket)
                drafted += 1
            self.stdout.write(f"Queued {ticket.reference}")

        self.stdout.write(self.style.SUCCESS(f"Queued {classified} classification(s) and {drafted} draft(s)."))
