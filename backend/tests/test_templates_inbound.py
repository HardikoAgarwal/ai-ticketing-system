import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.ai.models import AIDraft
from apps.demo.seed import build_workspace
from apps.demo.templates_data import TEMPLATES
from apps.kb.models import Article
from apps.tickets.models import Ticket
from apps.workspaces.models import Membership

TEMPLATE_KEYS = list(TEMPLATES)


@pytest.mark.parametrize("key", TEMPLATE_KEYS)
def test_template_spec_is_consistent(key):
    spec = TEMPLATES[key]
    titles = {a["title"] for a in spec["articles"]}
    cat_keys = {c["key"] for c in spec["categories"]}
    assert any(a.get("internal") for a in spec["articles"])
    assert sum(1 for c in spec["categories"] if c.get("is_default")) == 1
    for t in spec["tickets"]:
        assert t["category"] in cat_keys and t.get("ai_category", t["category"]) in cat_keys
        assert set(t.get("citations", [])) <= titles, t["subject"]
        assert t["customer"] < len(spec["customers"])
        if t.get("record") is not None:
            assert t["record"] < len(spec["customers"][t["customer"]]["records"]), t["subject"]
    assert all(p["category"] in cat_keys for p in spec["history_pool"])
    assert any(t.get("overridden") for t in spec["tickets"]) and any(t["status"] == "RESOLVED" and t.get("conversation") for t in spec["tickets"])


@pytest.mark.parametrize("key", TEMPLATE_KEYS)
def test_every_template_starts_via_api(db, key):
    resp = APIClient().post("/api/v1/demo/start/", {"template": key}, format="json")
    assert resp.status_code == 201
    slug = resp.data["workspace_slug"]
    agent = APIClient()
    agent.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['agent']['access']}")
    assert agent.get(f"/api/v1/w/{slug}/tickets/?page_size=100").data["count"] >= 50
    assert agent.get(f"/api/v1/w/{slug}/analytics/summary/").status_code == 200
    drafts = AIDraft.objects.filter(ticket__workspace__slug=slug)
    titles = set(Article.objects.filter(workspace__slug=slug).values_list("title", flat=True))
    assert drafts.exists()
    for d in drafts:
        assert d.citations and {c["title"] for c in d.citations} <= titles


def test_templates_list_endpoint(client_for, db):
    keys = {t["key"] for t in client_for().get("/api/v1/demo/templates/").data}
    assert keys == set(TEMPLATE_KEYS)


# --- Inbound email webhook ---------------------------------------------------

PAYLOAD = {"from_email": "New.Person@Example.com", "from_name": "New Person", "subject": "Printer is jammed", "body": "The printer on floor two is jammed again, please help."}


def post(ws_slug, secret="s3cret", **over):
    return APIClient().post("/api/v1/inbound/email/", {**PAYLOAD, "workspace": ws_slug, **over}, format="json", HTTP_X_INBOUND_SECRET=secret)


def test_inbound_disabled_without_secret(ws, settings):
    settings.INBOUND_EMAIL_SECRET = ""
    assert post(ws.slug).status_code == 404


def test_inbound_rejects_wrong_secret(ws, settings):
    settings.INBOUND_EMAIL_SECRET = "s3cret"
    assert post(ws.slug, secret="nope").status_code == 401


def test_inbound_creates_requester_and_ticket(ws, settings, fake_openai, django_capture_on_commit_callbacks):
    settings.INBOUND_EMAIL_SECRET = "s3cret"
    fake_openai.push_triage("technical", "MEDIUM")
    with django_capture_on_commit_callbacks(execute=True):
        resp = post(ws.slug)
    assert resp.status_code == 201 and resp.data["reference"] == "TKT-0001"
    user = User.objects.get(email="new.person@example.com")
    assert Membership.objects.get(workspace=ws, user=user).role == "REQUESTER"
    # second email reuses the same requester
    assert post(ws.slug, subject="Another issue here").status_code == 201
    assert Ticket.objects.filter(workspace=ws, requester=user).count() == 2
    assert User.objects.filter(email="new.person@example.com").count() == 1


def test_inbound_ignores_demo_workspaces_and_staff(ws, owner, settings):
    settings.INBOUND_EMAIL_SECRET = "s3cret"
    assert post("does-not-exist").status_code == 404
    assert post(ws.slug, from_email=owner.email).status_code == 403
    ws.is_demo = True
    ws.save()
    assert post(ws.slug).status_code == 404
