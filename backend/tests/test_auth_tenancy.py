import pytest

from tests.conftest import url


def test_register_creates_workspace_and_owner(client_for, db):
    resp = client_for().post(
        "/api/v1/auth/register/",
        {"full_name": "New Owner", "email": "new@x.test", "password": "Sup3rSecret!", "workspace_name": "Fresh Co"},
        format="json",
    )
    assert resp.status_code == 201
    slug = resp.data["workspace_slug"]
    assert resp.data["user"]["memberships"][0]["role"] == "OWNER"
    assert slug == "fresh-co"
    token = resp.data["access"]
    from rest_framework.test import APIClient

    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    assert c.get(f"/api/v1/w/{slug}/categories/").status_code == 200


def test_login_returns_memberships(client_for, customer, ws):
    resp = client_for().post("/api/v1/auth/login/", {"email": "CAT@acme.test", "password": "Passw0rd!"}, format="json")
    assert resp.status_code == 200
    assert resp.data["user"]["memberships"][0]["workspace"]["slug"] == ws.slug


def test_unauthenticated_is_rejected(client_for, ws):
    assert client_for().get(url(ws, "tickets/")).status_code == 401


def test_non_member_gets_404_not_403(client_for, ws, outsider):
    """A workspace's existence must not leak to outsiders."""
    assert client_for(outsider).get(url(ws, "tickets/")).status_code == 404
    assert client_for(outsider).get(url(ws, "categories/")).status_code == 404


def test_cross_workspace_ticket_isolation(client_for, ws, other_ws, customer, outsider):
    from apps.tickets import services

    ticket = services.create_ticket(workspace=ws, requester=customer, subject="Cannot log in", description="I cannot log in to my account at all.")
    # The outsider owns another workspace; even with the right ticket id it must 404 there.
    resp = client_for(outsider).get(f"/api/v1/w/{other_ws.slug}/tickets/{ticket.id}/")
    assert resp.status_code == 404


def test_requesters_cannot_use_staff_endpoints(client_for, ws, customer):
    c = client_for(customer)
    assert c.get(url(ws, "tickets/stats/")).status_code == 403
    assert c.get(url(ws, "analytics/summary/")).status_code == 403
    assert c.get(url(ws, "members/")).status_code == 403
    assert c.get(url(ws, "articles/")).status_code == 403


def test_only_managers_edit_settings(client_for, ws, owner, agent):
    assert client_for(agent).patch(url(ws, ""), {"agent_title": "X"}, format="json").status_code == 403
    resp = client_for(owner).patch(url(ws, ""), {"agent_title": "Acme Care Team"}, format="json")
    assert resp.status_code == 200 and resp.data["agent_title"] == "Acme Care Team"


def test_sla_hours_validated(client_for, ws, owner):
    bad = client_for(owner).patch(url(ws, ""), {"sla_hours": {"CRITICAL": 1}}, format="json")
    assert bad.status_code == 400
    ok = client_for(owner).patch(url(ws, ""), {"sla_hours": {"CRITICAL": 2, "HIGH": 8, "MEDIUM": 24, "LOW": 48}}, format="json")
    assert ok.status_code == 200


def test_expired_demo_workspace_is_gone(client_for, ws, customer):
    from datetime import timedelta

    from django.utils import timezone

    ws.is_demo = True
    ws.expires_at = timezone.now() - timedelta(hours=1)
    ws.save()
    assert client_for(customer).get(url(ws, "tickets/")).status_code == 410
