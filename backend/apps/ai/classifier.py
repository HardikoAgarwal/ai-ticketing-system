import json
from dataclasses import dataclass

from pydantic import BaseModel, Field, ValidationError

from apps.tickets.models import TicketCategory, TicketPriority

from . import client
from .context import format_date, format_inr
from .models import AIFeature
from .prompts import PROMPT_VERSION, CLASSIFY_SCHEMA, build_classification_messages


class _ClassificationPayload(BaseModel):
    category: TicketCategory
    priority: TicketPriority
    confidence: float = Field(ge=0, le=1)
    reasoning: str = Field(max_length=400)


@dataclass(frozen=True)
class ClassificationResult:
    category: str
    priority: str
    confidence: float
    reasoning: str


def _book_summary(ticket) -> str | None:
    """Only urgency-relevant book facts; the classifier never receives the Knowledge Base."""
    book = ticket.book
    if not book:
        return None
    if not book.is_published:
        return f"Status: {book.status_label}"
    return (
        f"Status: {book.status_label}; published {format_date(book.publication_date)}; "
        f"royalty pending {format_inr(book.royalty_pending)}; last payout {format_date(book.last_royalty_payout_date)}"
    )


def classify_ticket(ticket) -> ClassificationResult:
    result = client.chat(
        feature=AIFeature.CLASSIFY,
        messages=build_classification_messages(ticket.subject, ticket.description, _book_summary(ticket)),
        prompt_version=PROMPT_VERSION,
        ticket_id=ticket.id,
        max_tokens=150,
        temperature=0,
        response_format=CLASSIFY_SCHEMA,
    )
    try:
        payload = _ClassificationPayload.model_validate(json.loads(result.content))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise client.AIPermanentError(f"Invalid classification output: {exc}") from exc
    return ClassificationResult(
        category=payload.category.value,
        priority=payload.priority.value,
        confidence=round(payload.confidence, 2),
        reasoning=payload.reasoning.strip(),
    )
