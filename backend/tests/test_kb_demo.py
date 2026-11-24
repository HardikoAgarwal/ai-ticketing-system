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


def test_internal_articles_hidden_from_requester_suggestions(client_for, ws, customer, agent):
    pub = Article.objects.create(workspace=ws, title="Refund policy", body="You can request a refund for your annual plan within 14 days.")
    internal = Article.objects.create(workspace=ws, title="Refund approvals", is_internal=True, body="Refund approvals above two thousand dollars need finance sign off.")
    for a in (pub, internal):
        reindex_article(a, embed=False)
    got = client_for(customer).get(url(ws, "suggestions/?q=how do I get a refund approval for my annual plan")).data
    assert [s["title"] for s in got] == ["Refund policy"]
    staff = client_for(agent).get(url(ws, "articles/search/?q=refund approval finance")).data
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
