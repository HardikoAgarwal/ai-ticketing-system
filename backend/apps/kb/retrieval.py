"""Retrieval over a workspace's knowledge base.

Primary: cosine similarity between the query embedding and chunk embeddings (computed in Python;
a workspace KB is small, so no vector extension is needed). Fallback when no embeddings exist or
the embedding call fails: a keyword-overlap score, so retrieval never hard-fails.
"""

import hashlib
import logging
import math
import re
from dataclasses import dataclass

from django.core.cache import cache

from apps.ai import client

from .models import Chunk

logger = logging.getLogger(__name__)

STOPWORDS = frozenset(
    "a an the and or but of to in on for with is are was were be been it its this that i my me we our you your "
    "not no do does did have has had can could would should will just from at by as if so than then there".split()
)


@dataclass
class Hit:
    article_id: int
    title: str
    text: str
    score: float
    category_id: int | None = None
    is_internal: bool = False


def _tokens(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9']+", text.lower()) if len(w) > 2 and w not in STOPWORDS}


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def embed_query(query: str, *, workspace_id: int, ticket_id: int | None = None) -> list[float] | None:
    key = "emb:" + hashlib.sha256(query.encode()).hexdigest()
    cached = cache.get(key)
    if cached:
        return cached
    try:
        vector = client.embed([query[:2000]], workspace_id=workspace_id, ticket_id=ticket_id)[0]
    except client.AIError as exc:
        logger.info("Query embedding unavailable, using keyword retrieval: %s", exc)
        return None
    cache.set(key, vector, 3600)
    return vector


def search(
    workspace_id: int,
    query: str,
    *,
    k: int = 4,
    category_id: int | None = None,
    include_internal: bool = True,
    use_embeddings: bool = True,
    ticket_id: int | None = None,
) -> list[Hit]:
    chunks = Chunk.objects.filter(workspace_id=workspace_id, article__is_published=True).select_related("article")
    if not include_internal:
        chunks = chunks.filter(article__is_internal=False)
    chunks = list(chunks)
    if not chunks:
        return []

    scored: list[tuple[float, Chunk]] = []
    vector = embed_query(query, workspace_id=workspace_id, ticket_id=ticket_id) if use_embeddings else None
    if vector and any(c.embedding for c in chunks):
        for c in chunks:
            if c.embedding:
                scored.append((_cosine(vector, c.embedding), c))
    else:
        q = _tokens(query)
        if not q:
            return []
        for c in chunks:
            overlap = len(q & _tokens(c.article.title + " " + c.text))
            title_hits = len(q & _tokens(c.article.title))
            if overlap:
                scored.append(((overlap + 2 * title_hits) / math.sqrt(len(q) + 1), c))

    # A category match is a mild boost, not a filter: a ticket often spans categories.
    if category_id:
        scored = [(s * 1.1 if c.article.category_id == category_id else s, c) for s, c in scored]
    scored.sort(key=lambda sc: sc[0], reverse=True)

    hits: list[Hit] = []
    seen: set[int] = set()
    for score, c in scored:
        if c.article_id in seen:
            continue
        seen.add(c.article_id)
        hits.append(
            Hit(c.article_id, c.article.title, c.text, round(score, 4), c.article.category_id, c.article.is_internal)
        )
        if len(hits) >= k:
            break
    return hits
