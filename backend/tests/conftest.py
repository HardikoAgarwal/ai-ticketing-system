import json
from types import SimpleNamespace

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.kb.indexing import reindex_article
from apps.kb.models import Article
from apps.workspaces.models import Membership, Record, Role
from apps.workspaces.services import create_workspace


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


def make_user(email, name, ws=None, role=Role.REQUESTER, **membership):
    user = User.objects.create_user(email=email, password="Passw0rd!", full_name=name)
    if ws:
        Membership.objects.create(workspace=ws, user=user, role=role, **membership)
    return user


@pytest.fixture
def ws(db):
    return create_workspace(name="Acme Support", agent_title="Acme Support", tone="Friendly and brief.")


@pytest.fixture
def other_ws(db):
    return create_workspace(name="Other Co")


@pytest.fixture
def owner(ws):
    return make_user("owner@acme.test", "Olivia Owner", ws, Role.OWNER)


@pytest.fixture
def agent(ws):
    return make_user("agent@acme.test", "Adam Agent", ws, Role.AGENT)


@pytest.fixture
def customer(ws):
    return make_user("cat@acme.test", "Cat Customer", ws, Role.REQUESTER, company="Cat Co", profile={"plan": "Pro"})


@pytest.fixture
def other_customer(ws):
    return make_user("dan@acme.test", "Dan Customer", ws, Role.REQUESTER)


@pytest.fixture
def outsider(other_ws):
    return make_user("out@other.test", "Olly Outsider", other_ws, Role.OWNER)


@pytest.fixture
def record(ws, customer):
    return Record.objects.create(
        workspace=ws, owner=customer, kind="Subscription", reference="SUB-1", title="Pro plan", status="Active",
        data={"seats": 5, "renewal_date": "01 Jan 2027"},
    )


@pytest.fixture
def article(ws):
    cat = ws.categories.get(key="billing")
    art = Article.objects.create(
        workspace=ws, category=cat, title="Refund policy",
        body="Annual plans can be refunded within 14 days of purchase. Refunds return to the original payment method in 5-10 business days.",
    )
    reindex_article(art, embed=False)
    return art


@pytest.fixture
def client_for():
    def make(user=None):
        client = APIClient()
        if user is not None:
            client.force_authenticate(user)
        return client

    return make


def url(ws, path):
    return f"/api/v1/w/{ws.slug}/{path}"


class FakeOpenAI:
    """Stands in for openai.OpenAI; returns queued responses or raises queued exceptions."""

    def __init__(self):
        self.queue = []
        self.calls = []
        self.embed_calls = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))
        self.embeddings = SimpleNamespace(create=self._embed)

    def push(self, content=None, exc=None):
        self.queue.append((content, exc))

    def push_triage(self, category, priority, sentiment="NEUTRAL", reasoning="Test reasoning", summary="Test summary",
                    second_category="none"):
        self.push(json.dumps({
            "reasoning": reasoning, "category": category, "second_category": second_category,
            "priority": priority, "sentiment": sentiment, "summary": summary,
        }))

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        content, exc = self.queue.pop(0) if self.queue else ("Default draft reply.\n\nWarm regards,\nAcme Support", None)
        if exc:
            raise exc
        usage = SimpleNamespace(prompt_tokens=500, completion_tokens=120, prompt_tokens_details=None)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))], usage=usage)

    def _embed(self, **kwargs):
        self.embed_calls.append(kwargs)
        inputs = kwargs["input"]
        data = [SimpleNamespace(embedding=[1.0, 0.0, 0.0, 0.5]) for _ in inputs]
        return SimpleNamespace(data=data, usage=SimpleNamespace(prompt_tokens=10))


@pytest.fixture
def fake_openai(monkeypatch):
    fake = FakeOpenAI()
    monkeypatch.setattr("apps.ai.client._client", lambda: fake)
    return fake
