"""Precompute embeddings for demo templates so sandboxes never spend API quota on them.

Run once with a real key (OPENAI_API_KEY + AI_BASE_URL for Gemini) and commit the JSON files:
    python manage.py build_demo_embeddings [--template saas]
"""

import json

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.ai import client
from apps.demo.seed import DATA_DIR, ticket_embedding_key
from apps.demo.templates_data import TEMPLATES
from apps.kb.indexing import chunk_hash, split_text

BATCH = 50


def _embed_all(texts: dict[str, str]) -> dict[str, list[float]]:
    keys = list(texts)
    out: dict[str, list[float]] = {}
    for i in range(0, len(keys), BATCH):
        batch = keys[i : i + BATCH]
        vectors = client.embed([texts[k] for k in batch])
        out.update({k: [round(x, 6) for x in v] for k, v in zip(batch, vectors)})
    return out


class Command(BaseCommand):
    help = "Embed demo article chunks and ticket texts and write <template>.embeddings.json."

    def add_arguments(self, parser):
        parser.add_argument("--template", choices=list(TEMPLATES), help="Only one template")

    def handle(self, *args, **options):
        if not settings.AI_ENABLED:
            raise CommandError("AI is not enabled: set OPENAI_API_KEY (and AI_BASE_URL/AI_EMBED_MODEL).")
        for key in [options["template"]] if options["template"] else TEMPLATES:
            spec = TEMPLATES[key]
            chunk_texts: dict[str, str] = {}
            for a in spec["articles"]:
                body = a["body"].strip()
                for text in split_text(body):
                    # Must match apps.kb.indexing.embed_article_job's input shape.
                    chunk_texts[chunk_hash(a["title"], text)] = f"{a['title']}\n{text}"
            ticket_texts: dict[str, str] = {}
            for t in spec["tickets"]:
                ticket_texts[ticket_embedding_key(t["subject"], t["description"])] = f"{t['subject']}\n{t['description']}"[:2000]
            for p in spec["history_pool"]:
                ticket_texts[ticket_embedding_key(p["subject"], p["description"])] = f"{p['subject']}\n{p['description']}"[:2000]
            self.stdout.write(f"{key}: embedding {len(chunk_texts)} chunks and {len(ticket_texts)} tickets...")
            data = {"chunks": _embed_all(chunk_texts), "tickets": _embed_all(ticket_texts)}
            path = DATA_DIR / f"{key}.embeddings.json"
            path.write_text(json.dumps(data))
            self.stdout.write(self.style.SUCCESS(f"wrote {path.name}"))
