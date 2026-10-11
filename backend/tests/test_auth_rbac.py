import pytest

from apps.tickets import services
from apps.tickets.models import MessageKind

pytestmark = pytest.mark.django_db


def test_login_returns_tokens_and_user(seeded, client_for):
    res = client_for().post("/api/v1/auth/login/", {"email": "Priya.Sharma@email.com", "password": "Author@123"}, format="json")
    assert res.status_code == 200
    assert res.data["access"] and res.data["refresh"]
    assert res.data["user"]["role"] == "AUTHOR"


def test_login_failure_uses_error_envelope(seeded, client_for):
    res = client_for().post("/api/v1/auth/login/", {"email": "priya.sharma@email.com", "password": "wrong"}, format="json")
    assert res.status_code == 401
    assert set(res.data["error"]) == {"code", "message", "details"}


@pytest.mark.parametrize(
    "url", ["/api/v1/books/", "/api/v1/tickets/", "/api/v1/auth/me/", "/api/v1/admin/analytics/summary/"]
)
def test_endpoints_require_authentication(seeded, client_for, url):
    res = client_for().get(url)
    assert res.status_code == 401
    assert "error" in res.data


def test_author_sees_only_own_books(author, other_author, client_for):
    res = client_for(author).get("/api/v1/books/")
    assert res.status_code == 200
    books = res.data["results"] if isinstance(res.data, dict) else res.data
    codes = {b["author_code"] for b in books}
    assert codes == {author.author_profile.author_code}

    foreign = other_author.author_profile.books.first()
    assert client_for(author).get(f"/api/v1/books/{foreign.id}/").status_code == 404


def test_author_cannot_see_other_authors_ticket(author, other_author, client_for):
    ticket = services.create_ticket(author_user=other_author, subject="Help with my book", description="x" * 30)
    assert client_for(author).get(f"/api/v1/tickets/{ticket.id}/").status_code == 404
    assert all(t["id"] != ticket.id for t in client_for(author).get("/api/v1/tickets/").data["results"])


@pytest.mark.parametrize(
    "method,url",
    [
        ("get", "/api/v1/admin/analytics/summary/"),
        ("get", "/api/v1/admin/agents/"),
        ("get", "/api/v1/tickets/stats/"),
    ],
)
def test_admin_only_endpoints_forbid_authors(author, client_for, method, url):
    assert getattr(client_for(author), method)(url).status_code == 403


def test_author_cannot_triage_or_post_notes(author, client_for):
    ticket = services.create_ticket(author_user=author, subject="Where is my book", description="y" * 30)
    client = client_for(author)
    assert client.patch(f"/api/v1/tickets/{ticket.id}/", {"priority": "CRITICAL"}, format="json").status_code == 403
    assert client.post(f"/api/v1/tickets/{ticket.id}/assign-to-me/").status_code == 403
    assert client.get(f"/api/v1/tickets/{ticket.id}/draft/").status_code == 403


def test_internal_notes_hidden_from_author(author, admin_user, client_for):
    ticket = services.create_ticket(author_user=author, subject="ISBN mismatch", description="z" * 30)
    services.post_admin_message(ticket, admin_user, body="Internal: check with metadata team", kind=MessageKind.NOTE)
    services.post_admin_message(ticket, admin_user, body="Hi Priya, we're checking this now.", kind=MessageKind.REPLY)

    detail = client_for(author).get(f"/api/v1/tickets/{ticket.id}/").data
    bodies = [m["body"] for m in detail["messages"]]
    assert bodies == ["Hi Priya, we're checking this now."]
    for triage_field in ("priority", "ai_reasoning", "activities", "assigned_to"):
        assert triage_field not in detail

    listed = client_for(author).get(f"/api/v1/tickets/{ticket.id}/messages/").data
    assert [m["body"] for m in listed] == ["Hi Priya, we're checking this now."]

    admin_bodies = [m["body"] for m in client_for(admin_user).get(f"/api/v1/tickets/{ticket.id}/").data["messages"]]
    assert len(admin_bodies) == 2
