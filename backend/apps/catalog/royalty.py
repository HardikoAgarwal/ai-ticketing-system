"""Deterministic royalty facts derived from BookLeaf policy.

These are computed in code (never by the LLM) so AI drafts and the UI
quote exact, consistent dates and thresholds.
"""

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

MIN_PAYOUT_THRESHOLD = Decimal("1000")
PAYOUT_WINDOW_DAYS = 45
QUARTER_END_MONTH_DAY = ((3, 31), (6, 30), (9, 30), (12, 31))


@dataclass(frozen=True)
class PayoutWindow:
    quarter_label: str
    quarter_end: date
    payout_by: date


def _quarter_label(quarter_end: date) -> str:
    return f"Q{(quarter_end.month - 1) // 3 + 1} {quarter_end.year}"


def _quarter_ends_around(today: date) -> list[date]:
    ends = []
    for year in (today.year - 1, today.year, today.year + 1):
        ends.extend(date(year, m, d) for m, d in QUARTER_END_MONTH_DAY)
    return sorted(ends)


def next_payout_window(today: date | None = None) -> PayoutWindow:
    """The next payout deadline: earliest quarter end whose 45-day window has not elapsed."""
    today = today or date.today()
    for quarter_end in _quarter_ends_around(today):
        payout_by = quarter_end + timedelta(days=PAYOUT_WINDOW_DAYS)
        if payout_by >= today:
            return PayoutWindow(_quarter_label(quarter_end), quarter_end, payout_by)
    raise RuntimeError("Unreachable: quarter list always covers the next window")


def is_below_threshold(pending: Decimal) -> bool:
    return Decimal("0") < pending < MIN_PAYOUT_THRESHOLD


def royalty_notes(book, today: date | None = None) -> dict:
    """UI/AI-friendly royalty facts for a single book."""
    today = today or date.today()
    pending = Decimal(book.royalty_pending or 0)
    days_since_payout = (today - book.last_royalty_payout_date).days if book.last_royalty_payout_date else None
    return {
        "below_payout_threshold": is_below_threshold(pending),
        "all_paid": book.is_published and pending == 0 and Decimal(book.total_royalty_earned or 0) > 0,
        "never_paid": book.is_published and book.last_royalty_payout_date is None,
        "days_since_last_payout": days_since_payout,
    }
