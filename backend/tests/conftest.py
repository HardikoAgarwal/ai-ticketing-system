import json
from types import SimpleNamespace

import pytest
from django.core.cache import cache
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.catalog.models import Book


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def seeded(db):
    call_command("seed_bookleaf", verbosity=0)


@pytest.fixture
def admin_user(seeded):
    return User.objects.get(email="admin@bookleaf.com")


@pytest.fixture
def other_admin(seeded):
    return User.objects.get(email="neha@bookleaf.com")


@pytest.fixture
def author(seeded):
    return User.objects.get(email="priya.sharma@email.com")


@pytest.fixture
def other_author(seeded):
    return User.objects.get(email="rohit.kapoor@email.com")


@pytest.fixture
def author_book(author):
    return Book.objects.filter(author__user=author).first()


@pytest.fixture
def client_for():
    def make(user=None):
        client = APIClient()
        if user is not None:
            client.force_authenticate(user)
        return client

    return make


class FakeOpenAI:
    """Stands in for openai.OpenAI; returns queued responses or raises queued exceptions."""

    def __init__(self):
        self.queue = []
        self.calls = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def push(self, content=None, exc=None):
        self.queue.append((content, exc))

    def push_classification(self, category, priority, confidence=0.9, reasoning="Test reasoning"):
        self.push(json.dumps({"category": category, "priority": priority, "confidence": confidence, "reasoning": reasoning}))

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        content, exc = self.queue.pop(0) if self.queue else ("Default draft reply.\n\nWarm regards,\nBookLeaf Author Support", None)
        if exc:
            raise exc
        usage = SimpleNamespace(prompt_tokens=500, completion_tokens=120, prompt_tokens_details=None)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))], usage=usage)


@pytest.fixture
def fake_openai(monkeypatch):
    fake = FakeOpenAI()
    monkeypatch.setattr("apps.ai.client._client", lambda: fake)
    return fake
