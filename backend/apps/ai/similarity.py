"""Duplicate / related-ticket detection from stored ticket embeddings (cosine similarity)."""

from apps.kb.retrieval import _cosine
from apps.tickets.models import Ticket

THRESHOLD = 0.72
LIMIT = 5


def similar_tickets(ticket: Ticket) -> list[dict]:
    if not ticket.embedding:
        return []
    candidates = Ticket.objects.filter(workspace_id=ticket.workspace_id, embedding__isnull=False).exclude(pk=ticket.pk)
    scored = []
    for other in candidates.only("id", "number", "subject", "status", "embedding", "workspace"):
        sim = _cosine(ticket.embedding, other.embedding)
        if sim >= THRESHOLD:
            scored.append((sim, other))
    scored.sort(key=lambda t: t[0], reverse=True)
    return [
        {"id": o.id, "reference": o.reference, "subject": o.subject, "status": o.status, "similarity": round(sim, 3)}
        for sim, o in scored[:LIMIT]
    ]
