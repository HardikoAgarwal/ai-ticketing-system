"""Retrieval over a workspace's knowledge base.

Primary ("semantic"): cosine similarity between the query embedding and chunk embeddings (computed in Python;
a workspace KB is small, so no vector extension is needed). Fallback ("keyword"), used when no embeddings exist or
the embedding call fails: IDF-weighted word coverage with light stemming, so retrieval never hard-fails.

Both engines report a score on their own scale, and both drop anything below a relevance floor, so a question the
articles do not cover returns nothing instead of the least-bad article. Each hit also carries a plain `level`
("strong" or "possible") and a `match` percentage (0-100) that is absolute, not relative to the best hit.

The semantic cut-offs were calibrated with the real embedding model on customer-style questions against the demo
articles of two companies: questions the articles cover scored 0.55 to 0.80 (most 0.63+), and questions they do
not cover (weather, pizza, another company's topics) scored at most 0.49. The floor sits in that gap at 0.55;
"strong" (0.66) is where the answer is clearly the article's own topic. Short questions score lower than long
ones. Re-check these numbers if the embedding model changes.
"""

import hashlib
import logging
import math
import re
from dataclasses import dataclass, field

from django.core.cache import cache

from apps.ai import client

from .models import Chunk

logger = logging.getLogger(__name__)

SEMANTIC_FLOOR = 0.55
SEMANTIC_STRONG = 0.66
SEMANTIC_CEIL = 0.80
KEYWORD_FLOOR = 0.32
KEYWORD_STRONG = 0.58

# Words that are never evidence of topic, including the question words people start a request with.
STOPWORDS = frozenset(
    "a an the and or but of to in on for with is are was were be been it its this that i my me we our you your "
    "not no do does did have has had can could would should will just from at by as if so than then there "
    "what when where which who why how whose please help need want get got know tell about some any into over "
    "out up down off very really also still new all use using used one make like".split()
)

# Weight of a query word that appears in no article at all: likely filler or off-topic, so it counts against
# coverage, but less than a rare word the knowledge base does know.
UNSEEN_WEIGHT = 0.35
MIN_MASS = 1.4


@dataclass
class Hit:
    article_id: int
    title: str
    text: str
    score: float
    category_id: int | None = None
    is_internal: bool = False
    level: str = "possible"  # "strong" | "possible"
    match: int = 0  # 0-100, absolute
    matched_terms: list[str] = field(default_factory=list)


@dataclass
class SearchResult:
    hits: list[Hit]
    mode: str  # "semantic" | "keyword"
    pending: int = 0  # published articles still missing embeddings (not matchable by meaning yet)


def _stem(word: str) -> str:
    for suffix in ("ing", "ed", "es", "s"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            word = word[: -len(suffix)]
            break
    if word.endswith("e") and len(word) > 4:
        word = word[:-1]
    return word


def _words(text: str) -> list[str]:
    return [w for w in re.findall(r"[a-z0-9']+", text.lower()) if len(w) > 2 and w not in STOPWORDS]


def _tokens(text: str) -> set[str]:
    return {_stem(w) for w in _words(text)}


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


def _level(score: float, mode: str) -> str | None:
    floor, strong = (SEMANTIC_FLOOR, SEMANTIC_STRONG) if mode == "semantic" else (KEYWORD_FLOOR, KEYWORD_STRONG)
    if score >= strong:
        return "strong"
    return "possible" if score >= floor else None


def _match_percent(score: float, mode: str) -> int:
    if mode == "semantic":
        x = (score - SEMANTIC_FLOOR) / (SEMANTIC_CEIL - SEMANTIC_FLOOR)
    else:
        x = score
    return int(round(15 + 85 * min(1.0, max(0.0, x))))


def _matched_terms(text: str, query_stems: set[str]) -> list[str]:
    seen: list[str] = []
    for w in _words(text):
        if _stem(w) in query_stems and w not in seen:
            seen.append(w)
        if len(seen) >= 12:
            break
    return seen


def _keyword_scores(chunks: list[Chunk], query: str) -> list[tuple[float, Chunk]]:
    q = _tokens(query)
    if not q:
        return []
    bags = [_tokens(c.article.title + " " + c.text) for c in chunks]
    n = len(chunks)
    df = {s: sum(1 for bag in bags if s in bag) for s in q}

    def weight(stem: str) -> float:
        if not df[stem]:
            return UNSEEN_WEIGHT
        return min(1.0, max(0.1, math.log((n + 1) / (df[stem] + 0.5)) / math.log(n + 1)))

    weights = {s: weight(s) for s in q}
    mass = max(sum(weights.values()), MIN_MASS)
    scored = []
    for c, bag in zip(chunks, bags):
        matched = q & bag
        if not matched:
            continue
        title_hit = bool(matched & _tokens(c.article.title))
        # One shared ordinary word is coincidence, not an answer; it only counts when it is in the article's title.
        if len(matched) < 2 and not title_hit:
            continue
        score = sum(weights[s] for s in matched) / mass
        if title_hit:
            score += 0.12
        if len(matched) < 2:
            score = min(score, KEYWORD_STRONG - 0.01)  # a single word can make an article "possible", never "strong"
        scored.append((min(1.0, score), c))
    return scored


def search_with_info(
    workspace_id: int,
    query: str,
    *,
    k: int = 4,
    category_id: int | None = None,
    include_internal: bool = True,
    use_embeddings: bool = True,
    ticket_id: int | None = None,
) -> SearchResult:
    chunks = Chunk.objects.filter(workspace_id=workspace_id, article__is_published=True).select_related("article")
    if not include_internal:
        chunks = chunks.filter(article__is_internal=False)
    chunks = list(chunks)
    if not chunks:
        return SearchResult([], "keyword")

    vector = embed_query(query, workspace_id=workspace_id, ticket_id=ticket_id) if use_embeddings else None
    semantic = bool(vector and any(c.embedding for c in chunks))
    mode = "semantic" if semantic else "keyword"
    pending = len({c.article_id for c in chunks if not c.embedding}) if semantic else 0

    if semantic:
        scored = [(_cosine(vector, c.embedding), c) for c in chunks if c.embedding]
    else:
        scored = _keyword_scores(chunks, query)

    # A category match is a mild boost, not a filter: a ticket often spans categories.
    if category_id:
        scored = [(s * 1.1 if c.article.category_id == category_id else s, c) for s, c in scored]
    scored.sort(key=lambda sc: sc[0], reverse=True)

    query_stems = _tokens(query)
    hits: list[Hit] = []
    seen: set[int] = set()
    for score, c in scored:
        level = _level(score, mode)
        if level is None:
            break  # sorted, so everything after is below the floor too
        if c.article_id in seen:
            continue
        seen.add(c.article_id)
        hits.append(
            Hit(
                c.article_id, c.article.title, c.text, round(score, 4), c.article.category_id, c.article.is_internal,
                level=level, match=_match_percent(score, mode), matched_terms=_matched_terms(c.article.title + " " + c.text, query_stems),
            )
        )
        if len(hits) >= k:
            break
    return SearchResult(hits, mode, pending)


def search(workspace_id: int, query: str, **kwargs) -> list[Hit]:
    """The hits only, for callers that do not need to know which engine ran."""
    return search_with_info(workspace_id, query, **kwargs).hits
