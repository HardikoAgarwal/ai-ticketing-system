import json
from dataclasses import dataclass

from pydantic import BaseModel, Field, ValidationError

from . import client
from .context import record_lines
from .models import AIFeature
from .prompts import PROMPT_VERSION, build_classification_messages, classify_schema


class _Payload(BaseModel):
    category: str
    priority: str
    sentiment: str = "NEUTRAL"
    confidence: float = Field(ge=0, le=1)
    reasoning: str = Field(max_length=400)
    summary: str = Field(default="", max_length=400)


@dataclass(frozen=True)
class ClassificationResult:
    category_key: str
    priority: str
    sentiment: str
    confidence: float
    reasoning: str
    summary: str


def _context(ticket) -> str | None:
    """Only urgency-relevant facts; the classifier never receives the knowledge base."""
    return "\n".join(record_lines(ticket.record)) if ticket.record else None


def classify_ticket(ticket) -> ClassificationResult:
    workspace = ticket.workspace
    categories = list(workspace.categories.all())
    if not categories:
        raise client.AIPermanentError("Workspace has no categories configured")
    keys = [c.key for c in categories]
    result = client.chat(
        feature=AIFeature.CLASSIFY,
        messages=build_classification_messages(workspace, categories, ticket.subject, ticket.description, _context(ticket)),
        prompt_version=PROMPT_VERSION,
        ticket_id=ticket.id,
        workspace_id=workspace.id,
        max_tokens=220,
        temperature=0,
        response_format=classify_schema(keys),
    )
    try:
        payload = _Payload.model_validate(json.loads(result.content))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise client.AIPermanentError(f"Invalid triage output: {exc}") from exc
    if payload.category not in keys or payload.priority not in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
        raise client.AIPermanentError("Triage output used an unknown category or priority")
    sentiment = payload.sentiment if payload.sentiment in ("NEGATIVE", "NEUTRAL", "POSITIVE") else "NEUTRAL"
    return ClassificationResult(
        category_key=payload.category,
        priority=payload.priority,
        sentiment=sentiment,
        confidence=round(payload.confidence, 2),
        reasoning=payload.reasoning.strip(),
        summary=payload.summary.strip(),
    )
