import hashlib
import json
from dataclasses import dataclass

from django.conf import settings

from apps.kb import retrieval
from apps.tickets.models import MessageKind

from . import client
from .context import build_fact_sheet
from .models import AIDraft, AIFeature
from .prompts import PROMPT_VERSION, build_draft_messages

CONVERSATION_WINDOW = 3
KB_HITS = 4


@dataclass
class DraftInputs:
    messages: list[dict]
    citations: list[dict]
    input_hash: str


def _query(ticket, conversation) -> str:
    latest = next((body for who, body in reversed(conversation) if who == "Customer"), "")
    return f"{ticket.subject}\n{ticket.description}\n{latest}".strip()


def build_inputs(ticket, *, use_embeddings: bool = True) -> DraftInputs:
    """Assemble the prompt. Retrieval may embed the query, so call sparingly; results are cached."""
    workspace = ticket.workspace
    recent = list(
        ticket.messages.filter(kind=MessageKind.REPLY).select_related("sender").order_by("-created_at")[:CONVERSATION_WINDOW]
    )
    conversation = [("Customer" if m.sender_id == ticket.requester_id else "Support", m.body) for m in reversed(recent)]
    hits = retrieval.search(
        workspace.id,
        _query(ticket, conversation),
        k=KB_HITS,
        category_id=ticket.category_id,
        use_embeddings=use_embeddings,
        ticket_id=ticket.id,
    )
    messages = build_draft_messages(
        workspace=workspace,
        subject=ticket.subject,
        description=ticket.description,
        fact_sheet=build_fact_sheet(ticket),
        articles=hits,
        category_name=ticket.category.name if ticket.category else "General",
        conversation=conversation,
    )
    digest = hashlib.sha256(
        json.dumps({"v": PROMPT_VERSION, "model": settings.AI_MODEL, "m": messages}, sort_keys=True).encode()
    ).hexdigest()
    citations = [{"article_id": h.article_id, "title": h.title, "score": h.score} for h in hits]
    return DraftInputs(messages=messages, citations=citations, input_hash=digest)


def current_draft(ticket) -> AIDraft | None:
    """Latest draft whose inputs still match the ticket (category, conversation, facts, KB hits)."""
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
        workspace_id=ticket.workspace_id,
        max_tokens=450,
        temperature=0.4,
    )
    return AIDraft.objects.create(
        ticket=ticket,
        content=result.content,
        model=settings.AI_MODEL,
        prompt_version=PROMPT_VERSION,
        citations=inputs.citations,
        input_hash=inputs.input_hash,
    )
