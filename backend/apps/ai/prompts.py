"""Versioned prompt templates.

Static instructions come first in every request so repeated calls share a
prefix (eligible for OpenAI's automatic prompt caching); ticket-specific
data comes last.
"""

from apps.tickets.models import TicketCategory, TicketPriority

from .knowledge_base import KBSection, guidance_for_category, tone_guidelines

PROMPT_VERSION = "2026-10-11.v1"

CATEGORY_DEFINITIONS = {
    TicketCategory.ROYALTY_PAYMENTS: "Royalty amounts, payout timing, missing/late payments, bank details, royalty statements.",
    TicketCategory.ISBN_METADATA: "Wrong/duplicate ISBN, ISBN mismatch across platforms, title/author/description/metadata corrections.",
    TicketCategory.PRINTING_QUALITY: "Print defects, binding, blurry images, misaligned pages, author copy quality, reprints.",
    TicketCategory.DISTRIBUTION: "Book unavailable/not listed on Amazon, Flipkart, BookLeaf Store; stock sync; new listing timelines.",
    TicketCategory.BOOK_STATUS: "Where a book is in production (editing, cover, typesetting, proofreading...), delays, launch timing.",
    TicketCategory.GENERAL: "Account questions, packages, bio/profile updates, how-to questions, anything else.",
}

PRIORITY_RUBRIC = """\
CRITICAL: serious financial or legal harm needing same-day action, e.g. no royalty received for 6+ months or multiple missed payout cycles, legal/copyright/plagiarism threats, a live listing selling the wrong book or another author's content.
HIGH: BookLeaf-side errors or blocked sales: any ISBN error (duplicate, mismatch, wrong book linked; BookLeaf policy treats these as high priority), a payout overdue beyond the 45-day window, book unavailable for purchase on a platform, defective printed copies, production delayed well beyond normal.
MEDIUM: needs investigation or action but not urgent: royalty amount seems low, production status check, listing not live yet within the normal 7-10 business days.
LOW: informational or self-service requests: how-to questions, bio/description/profile updates, general feedback."""

CLASSIFY_SYSTEM = f"""\
You triage author support tickets for BookLeaf Publishing, a self-publishing company in India and the US.
Classify each ticket into exactly one category and one priority.

Categories:
{chr(10).join(f"- {key}: {desc}" for key, desc in CATEGORY_DEFINITIONS.items())}

Priority rubric:
{PRIORITY_RUBRIC}

Rules:
- Judge by the substance of the problem, using the book facts when provided (e.g. a book with no payout ever and long time since publication raises royalty urgency).
- Author frustration can raise priority by at most one level; never lower priority because the author is polite.
- If a ticket spans categories, choose the one the author most needs resolved.
- reasoning: one short sentence (max 25 words) an ops agent can scan.
- confidence: 0.0-1.0, how sure you are of the category."""

CLASSIFY_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "ticket_classification",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "enum": list(TicketCategory.values)},
                "priority": {"type": "string", "enum": list(TicketPriority.values)},
                "confidence": {"type": "number"},
                "reasoning": {"type": "string"},
            },
            "required": ["category", "priority", "confidence", "reasoning"],
            "additionalProperties": False,
        },
    },
}

MAX_DESCRIPTION_CHARS = 1500
MAX_MESSAGE_CHARS = 600


def truncate(text: str, limit: int) -> str:
    text = (text or "").strip()
    return text if len(text) <= limit else text[:limit].rstrip() + " [...]"


def build_classification_messages(subject: str, description: str, book_summary: str | None) -> list[dict]:
    user = f"Subject: {subject}\nDescription: {truncate(description, MAX_DESCRIPTION_CHARS)}"
    if book_summary:
        user += f"\n\nBook facts:\n{book_summary}"
    return [{"role": "system", "content": CLASSIFY_SYSTEM}, {"role": "user", "content": user}]


DRAFT_SYSTEM = f"""\
You are a senior member of the BookLeaf Publishing Author Support team writing a reply to an author.
BookLeaf is a self-publishing company (India and US) handling cover design, typesetting, ISBNs, printing, distribution and royalties.

Tone guidelines (follow strictly):
{tone_guidelines()}

Writing rules:
- Start with "Hi <first name>," then acknowledge the specific concern in your own words before any explanation.
- Use ONLY the facts in AUTHOR & BOOK FACTS and BOOKLEAF POLICY. Quote exact amounts (Rs), dates and statuses from them.
- Never invent order numbers, tracking IDs, payment references, bank details status, or amounts. If something must be checked, say the team will verify it and give the timeline.
- When escalating or investigating, commit to a concrete timeline taken from policy (e.g. within 48 hours, re-sync in 24-48 hours, reprint in 5-7 business days).
- If BookLeaf is at fault, own it plainly. If a delay is on the author's side, frame it collaboratively without blame.
- End with a clear next step for the author and/or BookLeaf.
- 110-220 words, plain text, short paragraphs. No markdown headings or bold. Use a short list only for steps the author must take.
- Do not mention AI, internal notes, ticket categories, or priorities.
- Sign off exactly as:
Warm regards,
BookLeaf Author Support"""


def build_draft_messages(
    *,
    subject: str,
    description: str,
    fact_sheet: str,
    sections: list[KBSection],
    category: str,
    conversation: list[tuple[str, str]],
) -> list[dict]:
    policy = "\n\n".join(f"[{s.title}]\n{s.text}" for s in sections)
    guidance = "\n".join(f'- For queries like "{g["query"]}": {g["guidance"]}' for g in guidance_for_category(category))
    parts = [
        f"BOOKLEAF POLICY:\n{policy}",
        f"HOW BOOKLEAF HANDLES SIMILAR QUERIES:\n{guidance}" if guidance else "",
        f"AUTHOR & BOOK FACTS:\n{fact_sheet}",
        f"AUTHOR'S TICKET:\nSubject: {subject}\n{truncate(description, MAX_DESCRIPTION_CHARS)}",
    ]
    if conversation:
        thread = "\n".join(f"{who}: {truncate(body, MAX_MESSAGE_CHARS)}" for who, body in conversation)
        parts.append(f"RECENT CONVERSATION (oldest first; reply to the latest author message):\n{thread}")
    parts.append("Write the reply now.")
    return [
        {"role": "system", "content": DRAFT_SYSTEM},
        {"role": "user", "content": "\n\n".join(p for p in parts if p)},
    ]
