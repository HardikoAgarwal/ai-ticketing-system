"""Loads the sectioned BookLeaf Knowledge Base and selects only what a ticket needs."""

from dataclasses import dataclass
from functools import lru_cache

import yaml
from django.conf import settings

KB_PATH = settings.BASE_DIR / "knowledge_base" / "kb.yaml"


@dataclass(frozen=True)
class KBSection:
    key: str
    title: str
    text: str


@lru_cache(maxsize=1)
def _load() -> dict:
    with open(KB_PATH, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def tone_guidelines() -> str:
    return _load()["tone_guidelines"].strip()


def sections_for_category(category: str) -> list[KBSection]:
    data = _load()
    keys = data["category_sections"].get(category) or data["category_sections"]["GENERAL"]
    return [KBSection(key, data["sections"][key]["title"], data["sections"][key]["text"].strip()) for key in keys]


def guidance_for_category(category: str) -> list[dict]:
    return _load()["response_guidance"].get(category, [])
