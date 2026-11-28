import pytest

from apps.demo.seed import build_workspace
from apps.kb import retrieval
from apps.kb.indexing import reindex_article, split_text
from apps.kb.models import Article
from apps.tickets.models import AIStatus, Ticket
from tests.conftest import url


def test_split_text_is_paragraph_aware():
    body = "\n\n".join(["p" * 300] * 5)
    chunks = split_text(body)
    assert len(chunks) == 3 and all(len(c) <= 1000 for c in chunks)


def test_keyword_retrieval_ranks_relevant_article(ws):
    for title, body in [("Refund policy", "Annual plans can be refunded within 14 days."), ("API limits", "Requests are limited to 600 per minute and return 429.")]:
        a = Article.objects.create(workspace=ws, title=title, body=body)
        reindex_article(a, embed=False)
    hits = retrieval.search(ws.id, "I got a 429 error, what is the rate of requests?", use_embeddings=False)
    assert hits[0].title == "API limits"
    assert retrieval.search(ws.id, "zzzz qqqq", use_embeddings=False) == []


def test_internal_articles_hidden_from_requester_suggestions(client_for, ws, customer, agent, no_embeddings):
    pub = Article.objects.create(workspace=ws, title="Refund policy", body="You can request a refund for your annual plan within 14 days.")
    internal = Article.objects.create(workspace=ws, title="Refund approvals", is_internal=True, body="Refund approvals above two thousand dollars need finance sign off.")
    for a in (pub, internal):
        reindex_article(a, embed=False)
    got = client_for(customer).get(url(ws, "suggestions/?q=how do I get a refund approval for my annual plan")).data
    assert [s["title"] for s in got] == ["Refund policy"]
    staff = client_for(agent).get(url(ws, "articles/search/?q=refund approval finance")).data["hits"]
    assert "Refund approvals" in [s["title"] for s in staff]


def test_article_crud_is_manager_only_and_reindexes(client_for, ws, owner, agent):
    resp = client_for(owner).post(url(ws, "articles/"), {"title": "Shipping times", "body": "Orders ship within two business days."}, format="json")
    assert resp.status_code == 201
    assert Article.objects.get(pk=resp.data["id"]).chunks.count() == 1
    assert client_for(agent).post(url(ws, "articles/"), {"title": "x", "body": "y"}, format="json").status_code == 403
    assert client_for(agent).get(url(ws, "articles/")).status_code == 200


def test_demo_start_builds_private_prefilled_workspace(client_for, db):
    resp = client_for().post("/api/v1/demo/start/", {"template": "saas"}, format="json")
    assert resp.status_code == 201
    slug = resp.data["workspace_slug"]
    from rest_framework.test import APIClient

    agent = APIClient()
    agent.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['agent']['access']}")
    customer = APIClient()
    customer.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['customer']['access']}")
    tickets = agent.get(f"/api/v1/w/{slug}/tickets/?page_size=100").data
    assert tickets["count"] >= 50
    first = agent.get(f"/api/v1/w/{slug}/tickets/{tickets['results'][0]['id']}/").data
    assert first["ai_status"] == AIStatus.COMPLETED
    assert agent.get(f"/api/v1/w/{slug}/analytics/summary/?days=30").data["totals"]["created"] > 20
    # customer view is scoped to one person and has no triage data
    mine = customer.get(f"/api/v1/w/{slug}/tickets/").data["results"]
    assert mine and all("priority" not in t for t in mine)
    # a second demo is a separate, isolated tenant
    other = client_for().post("/api/v1/demo/start/", {"template": "saas"}, format="json").data["workspace_slug"]
    assert other != slug and agent.get(f"/api/v1/w/{other}/tickets/").status_code == 404


def test_demo_featured_drafts_carry_citations(client_for, db):
    from apps.ai.models import AIDraft

    build_workspace("saas")
    assert AIDraft.objects.exists() and all(d.citations for d in AIDraft.objects.all())
    assert Ticket.objects.filter(status="OPEN").exists()


def test_expired_demos_are_purged(db):
    from datetime import timedelta

    from django.utils import timezone

    from apps.accounts.models import User
    from apps.workspaces.models import Workspace
    from apps.workspaces.services import purge_expired_demos

    b = build_workspace("saas")
    Workspace.objects.filter(pk=b["workspace"].pk).update(expires_at=timezone.now() - timedelta(minutes=1))
    assert purge_expired_demos() == 1
    assert not Workspace.objects.exists() and not User.objects.filter(is_demo=True).exists()


@pytest.fixture
def no_embeddings(monkeypatch):
    """Keyword engine only, and no network: the query embedding is reported unavailable."""
    monkeypatch.setattr(retrieval, "embed_query", lambda *a, **k: None)


def _article(ws, title, body, **kw):
    a = Article.objects.create(workspace=ws, title=title, body=body, **kw)
    reindex_article(a, embed=False)
    return a


def test_keyword_search_returns_nothing_for_uncovered_question(ws):
    _article(ws, "Refund policy", "Annual plans can be refunded within 14 days of purchase.")
    _article(ws, "API limits", "Requests are limited to 600 per minute and return 429.")
    result = retrieval.search_with_info(ws.id, "what is the weather today", use_embeddings=False)
    assert result.hits == [] and result.mode == "keyword"


def test_a_single_shared_ordinary_word_is_not_a_match(ws):
    _article(ws, "Quick start", "Connect a source in order to see events in your funnel.")
    assert retrieval.search(ws.id, "where is my order", use_embeddings=False) == []


def test_keyword_search_matches_word_forms_and_reports_terms(ws):
    _article(ws, "Refund policy", "Annual plans can be refunded within 14 days of purchase.")
    hits = retrieval.search(ws.id, "I was refunded twice on my plans", use_embeddings=False)
    assert hits and hits[0].title == "Refund policy"
    assert {"refunded", "plans"} <= set(hits[0].matched_terms)


def test_semantic_search_applies_the_relevance_floor(ws, monkeypatch):
    near = _article(ws, "Refund policy", "Annual plans can be refunded within 14 days.")
    far = _article(ws, "Brand colours", "Our logo uses a deep green on white.")
    near.chunks.update(embedding=[1.0, 0.0])
    far.chunks.update(embedding=[0.0, 1.0])
    monkeypatch.setattr(retrieval, "embed_query", lambda *a, **k: [0.9, 0.1])
    result = retrieval.search_with_info(ws.id, "refund", k=5)
    assert result.mode == "semantic"
    assert [h.title for h in result.hits] == ["Refund policy"]  # the far article is below the floor, not "the next best"
    assert result.hits[0].level == "strong" and result.hits[0].match > 50


def test_semantic_search_reports_articles_still_indexing(ws, monkeypatch):
    done = _article(ws, "Refund policy", "Annual plans can be refunded within 14 days.")
    _article(ws, "Shipping", "Orders ship in two days.")  # no embedding yet
    done.chunks.update(embedding=[1.0, 0.0])
    monkeypatch.setattr(retrieval, "embed_query", lambda *a, **k: [1.0, 0.0])
    assert retrieval.search_with_info(ws.id, "refund").pending == 1


def test_search_endpoint_gives_verdict_and_draft_usage(client_for, ws, agent, no_embeddings):
    _article(ws, "Refund policy", "Annual plans can be refunded within 14 days of purchase.")
    got = client_for(agent).get(url(ws, "articles/search/?q=can I get a refund on my annual plan")).data
    assert got["mode"] == "keyword" and got["verdict"] == "covered"
    hit = got["hits"][0]
    assert hit["title"] == "Refund policy" and hit["level"] == "strong" and hit["used_in_draft"] is True and hit["matched_terms"]
    none = client_for(agent).get(url(ws, "articles/search/?q=what is the weather today")).data
    assert none["verdict"] == "none" and none["hits"] == []
