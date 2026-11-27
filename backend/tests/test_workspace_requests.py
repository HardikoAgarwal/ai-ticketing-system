from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from apps.workspaces.models import WorkspaceRequest

URL = "/api/v1/workspace-requests/"
VALID = {
    "full_name": "Priya Shah",
    "email": "Priya@Northwind.test",
    "company": "Northwind",
    "team_size": "8 agents",
    "message": "We support an online shop and want to start next month.",
}


def test_request_is_stored_without_an_account(client_for, db):
    resp = client_for().post(URL, VALID, format="json")
    assert resp.status_code == 201
    saved = WorkspaceRequest.objects.get()
    assert (saved.full_name, saved.email, saved.company, saved.team_size) == ("Priya Shah", "priya@northwind.test", "Northwind", "8 agents")
    assert saved.handled is False
    assert "id" not in resp.data and resp.data["email"] == "priya@northwind.test"


def test_team_size_is_optional(client_for, db):
    body = {k: v for k, v in VALID.items() if k != "team_size"}
    assert client_for().post(URL, body, format="json").status_code == 201
    assert WorkspaceRequest.objects.get().team_size == ""


def test_missing_and_invalid_fields_are_rejected(client_for, db):
    resp = client_for().post(URL, {**VALID, "email": "not-an-email", "company": "", "message": "hi"}, format="json")
    assert resp.status_code == 400
    assert set(resp.data["error"]["details"]) == {"email", "company", "message"}
    assert not WorkspaceRequest.objects.exists()


def test_a_stale_token_does_not_block_the_form(db):
    """The landing page sends whatever token the browser still holds; a dead one must not turn into a 401."""
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
    assert client.post(URL, VALID, format="json").status_code == 201


def test_requests_are_rate_limited(client_for, db, monkeypatch):
    monkeypatch.setattr(ScopedRateThrottle, "THROTTLE_RATES", {"workspace_request": "2/hour"})
    client = client_for()
    assert [client.post(URL, VALID, format="json").status_code for _ in range(3)] == [201, 201, 429]
    assert WorkspaceRequest.objects.count() == 2
