"""Rule-based classifier used instantly at ticket creation and whenever the LLM is unavailable.

It guarantees every ticket has a sensible category and priority even with
no AI at all; the LLM result (when it arrives) refines it.
"""

import re
from dataclasses import dataclass

from apps.tickets.models import TicketCategory, TicketPriority

# keyword -> weight. Keywords match at word starts, so "royalt" matches "royalty"/"royalties".
CATEGORY_KEYWORDS: dict[str, dict[str, int]] = {
    TicketCategory.ROYALTY_PAYMENTS: {
        "royalt": 3, "payout": 3, "payment": 2, "paid": 1, "bank": 2, "earning": 2, "money": 1, "transfer": 1, "₹": 1,
    },
    TicketCategory.ISBN_METADATA: {
        "isbn": 4, "metadata": 3, "barcode": 2, "misspel": 2, "wrong title": 2, "wrong author": 2,
    },
    TicketCategory.PRINTING_QUALITY: {
        "misprint": 3, "binding": 3, "blurry": 3, "misaligned": 3, "print quality": 3, "defect": 2, "torn": 2,
        "colour": 1, "color": 1, "author copies": 2, "reprint": 2,
    },
    TicketCategory.DISTRIBUTION: {
        "unavailable": 3, "out of stock": 3, "not listed": 3, "flipkart": 2, "amazon": 1, "listing": 1,
        "not showing": 2, "availability": 2, "can't find": 2, "cannot find": 2,
    },
    TicketCategory.BOOK_STATUS: {
        "typesetting": 3, "cover design": 3, "proofread": 3, "production": 2, "editing": 2, "stage": 1,
        "manuscript": 2, "published yet": 2, "delay": 1,
    },
}

CRITICAL_PATTERNS = (
    r"\b(\d+|six|several|many)\s+months?\b.*\b(no|not|never|haven'?t)\b.*\b(royalt|paid|payment)",
    r"\b(no|not|never|haven'?t)\b.*\b(royalt\w*|paid|payments?)\b.*\b(\d+|six|several|many)\s+months?\b",
    r"\blegal\b|\blawyer\b|\bfraud\b|\bscam\b|\bcopyright\b|\bplagiari",
)
HIGH_PATTERNS = (
    r"\bwrong\b|\bduplicate\b|\berror\b|\bincorrect\b|\bmismatch\b|\bdifferent isbn\b",
    r"\bnot received\b|\bhaven'?t received\b|\bnever received\b|\boverdue\b|\bmissing\b",
    r"\bunavailable\b|\bout of stock\b|\bterrible\b|\bdefect|\bmisprint|\bblurry\b|\bmisaligned\b|\burgent\b|\basap\b",
)
LOW_PATTERNS = (
    r"^\s*(can|could|how|is it possible|may) i\b",
    r"\bupdate (my )?(bio|author bio|profile|photo|description)\b",
    r"\bjust (wanted|curious)\b|\bquick question\b|\bsuggestion\b",
)


def _score(text: str, keywords: dict[str, int]) -> int:
    return sum(weight for kw, weight in keywords.items() if re.search(r"(?<!\w)" + re.escape(kw), text))


@dataclass(frozen=True)
class FallbackResult:
    category: str
    priority: str
    reasoning: str


def classify(subject: str, description: str) -> FallbackResult:
    text = f"{subject}\n{description}".lower()

    scores = {cat: _score(text, kws) for cat, kws in CATEGORY_KEYWORDS.items()}
    best_category, best_score = max(scores.items(), key=lambda item: item[1])
    category = best_category if best_score > 0 else TicketCategory.GENERAL

    if any(re.search(p, text, re.S) for p in CRITICAL_PATTERNS):
        priority = TicketPriority.CRITICAL
    elif category == TicketCategory.ISBN_METADATA and re.search(r"\bisbn\b", text) and any(
        re.search(p, text) for p in HIGH_PATTERNS[:1]
    ):
        priority = TicketPriority.HIGH
    elif any(re.search(p, text) for p in HIGH_PATTERNS):
        priority = TicketPriority.HIGH
    elif any(re.search(p, text) for p in LOW_PATTERNS):
        priority = TicketPriority.LOW
    else:
        priority = TicketPriority.MEDIUM

    return FallbackResult(
        category=category,
        priority=priority,
        reasoning="Estimated by keyword rules while AI classification is pending or unavailable.",
    )
