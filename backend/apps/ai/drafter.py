import hashlib
import json
from dataclasses import dataclass

from django.conf import settings

from apps.tickets.models import MessageKind

from . import client
from .context import build_fact_sheet
from .knowledge_base import sections_for_category
from .models import AIDraft, AIFeature
from .prompts import PROMPT_VERSION, build_draft_messages

CONVERSATION_WINDOW = 3


@dataclass
class DraftInputs:
    messages: list[dict]
    kb_sections: list[dict]
    input_hash: str


def build_inputs(ticket) -> DraftInputs:
    """Assemble the prompt. Cheap (no API call), so it also serves as the cache key."""
    sections = sections_for_category(ticket.category)
    recent = list(
        ticket.messages.exclude(kind=MessageKind.NOTE)
        .exclude(kind=MessageKind.SYSTEM)
        .select_related("sender")
        .order_by("-created_at")[:CONVERSATION_WINDOW]
    )
    conversation = [
        ("Author" if m.sender_id == ticket.author.user_id else "BookLeaf", m.body) for m in reversed(recent)
    ]
    messages = build_draft_messages(
        subject=ticket.subject,
        description=ticket.description,
        fact_sheet=build_fact_sheet(ticket),
        sections=sections,
        category=ticket.category,
        conversation=conversation,
    )
    digest = hashlib.sha256(
        json.dumps({"v": PROMPT_VERSION, "model": settings.AI_MODEL, "m": messages}, sort_keys=True).encode()
    ).hexdigest()
    return DraftInputs(
        messages=messages,
        kb_sections=[{"key": s.key, "title": s.title} for s in sections],
        input_hash=digest,
    )


def current_draft(ticket) -> AIDraft | None:
    """Latest draft whose inputs still match the ticket (category, conversation, facts)."""
    inputs = build_inputs(ticket)
    return ticket.ai_drafts.filter(input_hash=inputs.input_hash).first()


def generate_draft(ticket, *, force: bool = False) -> AIDraft:
    inputs = build_inputs(ticket)
    if not force:
        cached = ticket.ai_drafts.filter(input_hash=inputs.input_hash).first()
        if cached:
            return cached
    result = client.chat(
        feature=AIFeature.DRAFT,
        messages=inputs.messages,
        prompt_version=PROMPT_VERSION,
        ticket_id=ticket.id,
        max_tokens=450,
        temperature=0.4,
    )
    return AIDraft.objects.create(
        ticket=ticket,
        content=result.content,
        model=settings.AI_MODEL,
        prompt_version=PROMPT_VERSION,
        kb_sections=inputs.kb_sections,
        input_hash=inputs.input_hash,
    )
