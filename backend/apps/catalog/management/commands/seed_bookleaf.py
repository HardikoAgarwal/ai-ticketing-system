"""Idempotently load the BookLeaf sample dataset, team accounts and (optionally) demo tickets.

    python manage.py seed_bookleaf --file ../data/bookleaf_sample_data.json --with-sample-tickets
"""

import json
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AuthorProfile, User
from apps.catalog.models import Book, ProductionStage
from apps.tickets import services
from apps.tickets.models import MessageKind, Ticket, TicketActivity, TicketMessage, TicketStatus

AUTHOR_PASSWORD = "Author@123"
ADMIN_PASSWORD = "Admin@123"
ADMINS = (
    ("admin@bookleaf.com", "Aarav Mehta", True),
    ("neha@bookleaf.com", "Neha Verma", False),
    ("kabir@bookleaf.com", "Kabir Singh", False),
)

STAGE_BY_LABEL = {choice.label.lower(): choice.value for choice in ProductionStage}

# (author_code, book_code | None, hours_ago, subject, description, handling)
SAMPLE_TICKETS = (
    ("AUTH003", "BK005", 5, "Still no royalty for Between Two Temples",
     "My book was published in July 2024 and I can see 67 copies sold on my dashboard, but I have not received a single "
     "royalty payment so far. It has been many months now. Can someone please tell me what is going on?", None),
    ("AUTH002", "BK003", 2, "Different ISBN on Amazon vs my printed copy",
     "The ISBN printed on the back cover of Code & Karma does not match the ISBN shown on the Amazon India listing. "
     "Readers are confused and I am worried sales are being attributed to the wrong book. Please fix this urgently.", None),
    ("AUTH007", "BK013", 30, "Midnight in Mysore stuck in cover design",
     "It has been almost 4 weeks and my thriller is still showing 'Cover Design'. I shared my feedback on the second "
     "concept two weeks ago. When will this move to the next stage?", None),
    ("AUTH004", "BK006", 34, "Author copies have blurry images and misaligned pages",
     "I received my 20 author copies of Debugging Life yesterday. The illustrations in chapter 3 are blurry and several "
     "pages are misaligned. I cannot give these copies out at my book launch.", "in_progress"),
    ("AUTH005", "BK009", 52, "Letters from Lakshadweep unavailable on Amazon US",
     "Friends in the US are telling me the book shows 'Currently unavailable' on Amazon US. It was available last month. "
     "Can you check?", None),
    ("AUTH006", None, 1, "How do I update my author bio?",
     "Hi team, I would like to update the author bio that appears on my book pages. Is this possible after publishing?", None),
    ("AUTH009", "BK016", 96, "Why haven't I received my pending royalty?",
     "My dashboard shows Rs 850 pending for The Nagpur Notebooks but no payout has been made. When will I receive it?",
     "resolved"),
    ("AUTH001", "BK001", 150, "Royalty amount seems too low",
     "I have sold 342 copies of Whispers of the Ganges but the royalty paid so far feels low compared to the MRP of Rs 399. "
     "Could you explain how it is calculated?", "closed"),
    ("AUTH010", "BK018", 3, "Howrah Nights not listed on Flipkart",
     "Howrah Nights was published in January but I still cannot find it on Flipkart. Other books of mine are listed there. "
     "Is there a problem?", None),
)

REPLIES = {
    "in_progress": (
        "Hi Vikram,\n\nI'm really sorry your author copies of Debugging Life arrived like this, especially with your launch "
        "coming up. Blurry illustrations and misaligned pages are not the standard we hold ourselves to.\n\nCould you share "
        "2-3 photos of the affected pages (chapter 3 and any misaligned spreads)? Once our print team verifies them, we will "
        "arrange a free reprint of all 20 copies, which takes 5-7 business days.\n\nWarm regards,\nBookLeaf Author Support"
    ),
    "resolved": (
        "Hi Kavita,\n\nThank you for checking in about the Rs 850 pending for The Nagpur Notebooks, and I understand it is "
        "frustrating to see an amount and not receive it.\n\nOur minimum payout threshold is Rs 1,000. Because your pending "
        "royalty is currently below this, it rolls over to the next quarter and will be paid automatically once your "
        "accumulated royalties cross Rs 1,000. Nothing is lost.\n\nYou can follow your per-platform sales in the dashboard. "
        "If you have any other questions, just reply here.\n\nWarm regards,\nBookLeaf Author Support"
    ),
    "closed": (
        "Hi Priya,\n\nThanks for asking, and it's a fair question. Your royalty is 80% of the net profit per copy, where net "
        "profit is the MRP minus printing cost, platform commission (Amazon/Flipkart) and shipping. For Whispers of the "
        "Ganges that works out to Rs 35 per copy, so 342 copies = Rs 11,970 earned, of which Rs 8,400 has been paid and "
        "Rs 3,570 is pending for the next payout.\n\nI'm happy to share a line-by-line breakdown per platform if useful.\n\n"
        "Warm regards,\nBookLeaf Author Support"
    ),
}


class Command(BaseCommand):
    help = "Seed BookLeaf authors, books, team accounts and optional demo tickets (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--file", default=str(settings.BASE_DIR.parent / "data" / "bookleaf_sample_data.json"))
        parser.add_argument("--with-sample-tickets", action="store_true")

    def handle(self, *args, **options):
        path = Path(options["file"])
        if not path.exists():
            raise CommandError(f"Dataset not found: {path}")
        data = json.loads(path.read_text(encoding="utf-8"))

        with transaction.atomic():
            self._seed_admins()
            authors, books = self._seed_catalog(data["authors"])
        self.stdout.write(self.style.SUCCESS(f"Seeded {authors} authors, {books} books, {len(ADMINS)} admins."))

        if options["with_sample_tickets"]:
            if Ticket.objects.exists():
                self.stdout.write("Tickets already exist; skipping sample tickets.")
            else:
                self._seed_tickets()
                self.stdout.write(self.style.SUCCESS(f"Created {len(SAMPLE_TICKETS)} sample tickets."))

    def _seed_admins(self):
        for email, name, superuser in ADMINS:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"full_name": name, "role": User.Role.ADMIN, "is_staff": True, "is_superuser": superuser},
            )
            if created:
                user.set_password(ADMIN_PASSWORD)
                user.save()

    def _seed_catalog(self, authors_data):
        book_count = 0
        for a in authors_data:
            user, created = User.objects.update_or_create(
                email=a["email"].lower(), defaults={"full_name": a["name"], "role": User.Role.AUTHOR}
            )
            if created:
                user.set_password(AUTHOR_PASSWORD)
                user.save()
            profile, _ = AuthorProfile.objects.update_or_create(
                author_code=a["author_id"],
                defaults={"user": user, "phone": a.get("phone", ""), "city": a.get("city", ""), "joined_date": a.get("joined_date")},
            )
            for b in a.get("books", []):
                Book.objects.update_or_create(
                    book_code=b["book_id"],
                    defaults={
                        "author": profile,
                        "title": b["title"],
                        "isbn": b.get("isbn") or "",
                        "genre": b.get("genre") or "",
                        "publication_date": b.get("publication_date"),
                        "stage": self._stage(b.get("status", "")),
                        "mrp": b.get("mrp"),
                        "author_royalty_per_copy": b.get("author_royalty_per_copy"),
                        "total_copies_sold": b.get("total_copies_sold") or 0,
                        "total_royalty_earned": Decimal(str(b.get("total_royalty_earned") or 0)),
                        "royalty_paid": Decimal(str(b.get("royalty_paid") or 0)),
                        "royalty_pending": Decimal(str(b.get("royalty_pending") or 0)),
                        "last_royalty_payout_date": b.get("last_royalty_payout_date"),
                        "print_partner": b.get("print_partner") or "",
                        "available_on": b.get("available_on") or [],
                    },
                )
                book_count += 1
        return len(authors_data), book_count

    @staticmethod
    def _stage(status: str) -> str:
        label = status.lower().replace("in production - ", "").strip()
        if label not in STAGE_BY_LABEL:
            raise CommandError(f"Unknown book status: {status!r}")
        return STAGE_BY_LABEL[label]

    def _seed_tickets(self):
        now = timezone.now()
        agents = list(User.objects.filter(role=User.Role.ADMIN).order_by("id"))
        for index, (author_code, book_code, hours_ago, subject, description, handling) in enumerate(SAMPLE_TICKETS):
            profile = AuthorProfile.objects.select_related("user").get(author_code=author_code)
            book = Book.objects.get(book_code=book_code) if book_code else None
            created_at = now - timedelta(hours=hours_ago)
            with transaction.atomic():
                ticket = services.create_ticket(author_user=profile.user, subject=subject, description=description, book=book)
                ticket.created_at = created_at
                ticket.last_author_activity_at = created_at
                ticket.author_last_seen_at = created_at
                ticket.set_priority(ticket.priority)
                ticket.save()
                TicketActivity.objects.filter(ticket=ticket).update(created_at=created_at)

                if handling:
                    agent = agents[index % len(agents)]
                    replied_at = created_at + timedelta(hours=min(3, hours_ago / 4))
                    message = services.post_admin_message(
                        ticket, agent, body=REPLIES[handling], kind=MessageKind.REPLY, resolve=handling != "in_progress"
                    )
                    if handling == "closed":
                        services.confirm_resolution(ticket, profile.user, resolved=True)
                    TicketMessage.objects.filter(pk=message.pk).update(created_at=replied_at)
                    TicketActivity.objects.filter(ticket=ticket).exclude(action="CREATED").update(created_at=replied_at)
                    fields = {
                        "first_response_at": replied_at,
                        "last_admin_reply_at": replied_at,
                        "admin_last_seen_at": replied_at,
                        "author_last_seen_at": replied_at if handling == "closed" else created_at,
                    }
                    if handling in ("resolved", "closed"):
                        fields["resolved_at"] = replied_at
                    if handling == "closed":
                        fields["closed_at"] = replied_at + timedelta(hours=2)
                    Ticket.objects.filter(pk=ticket.pk).update(**fields)
