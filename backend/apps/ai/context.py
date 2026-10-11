"""Builds the compact, deterministic fact sheet the LLM is allowed to quote.

Only fields relevant to the ticket's category are included, which keeps
prompts small and stops the model from inventing numbers.
"""

from datetime import date
from decimal import Decimal

from apps.catalog.models import ProductionStage
from apps.catalog.royalty import MIN_PAYOUT_THRESHOLD, next_payout_window, royalty_notes
from apps.tickets.models import TicketCategory


def format_inr(value) -> str:
    amount = int(Decimal(value or 0))
    digits = str(abs(amount))
    if len(digits) > 3:
        head, tail = digits[:-3], digits[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        digits = ",".join(groups + [tail])
    return f"{'-' if amount < 0 else ''}Rs {digits}"


def format_date(value: date | None) -> str:
    return value.strftime("%d %b %Y") if value else "not yet"


def _book_facts(book, category: str) -> list[str]:
    facts = [
        f'Book: "{book.title}" ({book.book_code}), genre {book.genre or "n/a"}',
        f"Status: {book.status_label}",
    ]
    if not book.is_published:
        stages = ProductionStage.ordered()
        facts.append(
            f"Production progress: stage {book.stage_index + 1} of {len(stages)} "
            f"({book.get_stage_display()}); not yet published, so no sales or royalties yet"
        )
        return facts

    facts.append(f"Published on: {format_date(book.publication_date)}")
    if category in (TicketCategory.ISBN_METADATA, TicketCategory.DISTRIBUTION, TicketCategory.GENERAL):
        facts.append(f"ISBN on record: {book.isbn or 'not assigned'}")
        facts.append(f"Listed on: {', '.join(book.available_on) or 'no platforms yet'}")
    if category in (TicketCategory.PRINTING_QUALITY, TicketCategory.DISTRIBUTION):
        facts.append(f"Print partner: {book.print_partner or 'In-House'}")
    if category in (TicketCategory.ROYALTY_PAYMENTS, TicketCategory.GENERAL):
        notes = royalty_notes(book)
        facts.extend(
            [
                f"MRP: {format_inr(book.mrp)}; author royalty per copy: {format_inr(book.author_royalty_per_copy)}",
                f"Copies sold: {book.total_copies_sold}",
                f"Royalty earned: {format_inr(book.total_royalty_earned)}; paid: {format_inr(book.royalty_paid)}; "
                f"pending: {format_inr(book.royalty_pending)}",
                f"Last payout: {format_date(book.last_royalty_payout_date)}"
                + (f" ({notes['days_since_last_payout']} days ago)" if notes["days_since_last_payout"] is not None else ""),
            ]
        )
        if notes["below_payout_threshold"]:
            facts.append(
                f"Pending amount is below the {format_inr(MIN_PAYOUT_THRESHOLD)} minimum payout threshold "
                "and rolls over to the next quarter"
            )
        if notes["never_paid"]:
            facts.append("No royalty payout has been made for this book yet")
    return facts


def build_fact_sheet(ticket, today: date | None = None) -> str:
    today = today or date.today()
    author = ticket.author
    lines = [
        f"Today's date: {format_date(today)}",
        f"Author first name: {author.user.first_name_display}",
        f"Author since: {format_date(author.joined_date)}",
    ]
    if ticket.category == TicketCategory.ROYALTY_PAYMENTS:
        window = next_payout_window(today)
        lines.append(
            f"Next royalty payout: royalties for {window.quarter_label} (quarter ending "
            f"{format_date(window.quarter_end)}) are paid by {format_date(window.payout_by)}"
        )

    if ticket.book:
        lines.extend(_book_facts(ticket.book, ticket.category))
    else:
        books = list(author.books.all()[:5])
        lines.append("Query is account-level (no specific book selected). Author's books:")
        lines.extend(f"- {b.title}: {b.status_label}" for b in books)
    return "\n".join(lines)
