"""Chunk articles and (optionally) embed the chunks."""

import hashlib
import logging
import re

from django.conf import settings

from apps.ai import client
from apps.jobs import runner

from .models import Article, Chunk

logger = logging.getLogger(__name__)

TARGET_CHARS = 700


def split_text(body: str) -> list[str]:
    """Paragraph-aware chunks of roughly TARGET_CHARS."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", body.strip()) if p.strip()]
    chunks, current = [], ""
    for p in paragraphs:
        if current and len(current) + len(p) > TARGET_CHARS:
            chunks.append(current)
            current = p
        else:
            current = f"{current}\n\n{p}" if current else p
    if current:
        chunks.append(current)
    return chunks or [body.strip()]


def chunk_hash(article_title: str, text: str) -> str:
    return hashlib.sha256(f"{article_title}\n{text}".encode()).hexdigest()


def reindex_article(article: Article, *, embeddings: dict[str, list[float]] | None = None, embed: bool = True) -> None:
    """Rebuild chunks. `embeddings` maps chunk_hash -> vector (precomputed demo data) to avoid API calls."""
    article.chunks.all().delete()
    created = []
    for i, text in enumerate(split_text(article.body)):
        vector = (embeddings or {}).get(chunk_hash(article.title, text))
        created.append(Chunk(article=article, workspace_id=article.workspace_id, position=i, text=text, embedding=vector))
    Chunk.objects.bulk_create(created)
    if embed and settings.AI_ENABLED and any(c.embedding is None for c in created) and article.workspace.ai_enabled:
        runner.enqueue("kb.embed_article", article_id=article.pk)


@runner.task("kb.embed_article")
def embed_article_job(article_id: int) -> None:
    article = Article.objects.filter(pk=article_id).select_related("workspace").first()
    if not article:
        return
    chunks = list(article.chunks.filter(embedding__isnull=True))
    if not chunks:
        return
    try:
        vectors = client.embed([f"{article.title}\n{c.text}" for c in chunks], workspace_id=article.workspace_id)
    except client.AIUnavailableError as exc:
        raise runner.Retry(str(exc), delay=10) from exc
    except client.AIError as exc:
        logger.warning("Embedding article %s skipped: %s", article_id, exc)
        return
    for chunk, vector in zip(chunks, vectors):
        chunk.embedding = vector
    Chunk.objects.bulk_update(chunks, ["embedding"])
