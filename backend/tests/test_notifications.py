import pytest

from apps.tickets import services
from apps.tickets.models import MessageKind, Ticket, TicketStatus

pytestmark = pytest.mark.django_db

FEED = "/api/v1/tickets/notifications/"


def new_ticket(author, settings, subject="Royalty not received"):
    settings.AI_ENABLED = False
    return services.create_ticket(
        author_user=author, subject=subject, description="My royalty for last quarter has not arrived yet.", book=None, files=[]
    )


def reply(ticket, admin, body, **kwargs):
    return services.post_admin_message(ticket, admin, body=body, kind=MessageKind.REPLY, **kwargs)


def kinds_for(client, ticket):
    return [i["kind"] for i in client.get(FEED).data["items"] if i["ticket_id"] == ticket.id]


def test_admin_sees_new_ticket_then_author_reply(admin_user, author, client_for, settings):
    ticket = new_ticket(author, settings)
    admin = client_for(admin_user)
    assert kinds_for(admin, ticket) == ["new_ticket"]

    reply(ticket, admin_user, "Looking into it.")
    assert kinds_for(admin, ticket) == []

    services.post_author_message(ticket, author, body="Any update on this?")
    feed = admin.get(FEED).data
    item = next(i for i in feed["items"] if i["ticket_id"] == ticket.id)
    assert item["kind"] == "author_reply"
    assert item["preview"] == "Any update on this?"
    assert item["owner"] == "you"


def test_admin_queue_labels_unread_rows(admin_user, author, client_for, settings):
    ticket = new_ticket(author, settings)
    admin = client_for(admin_user)

    def unread_kind():
        return next(t for t in admin.get("/api/v1/tickets/").data["results"] if t["id"] == ticket.id)["unread_kind"]

    assert unread_kind() == "new_ticket"
    reply(ticket, admin_user, "Looking into it.")
    assert unread_kind() is None
    services.post_author_message(ticket, author, body="Any update on this?")
    assert unread_kind() == "author_reply"
    assert admin.get(f"/api/v1/tickets/{ticket.id}/").data["unread_kind"] == "author_reply"


def test_admin_feed_skips_tickets_owned_by_another_agent(admin_user, other_admin, author, client_for, settings):
    ticket = new_ticket(author, settings)
    services.update_ticket(ticket, other_admin, assigned_to=other_admin)
    assert kinds_for(client_for(admin_user), ticket) == []
    assert kinds_for(client_for(other_admin), ticket) == ["new_ticket"]


def test_author_sees_reply_and_resolution(admin_user, author, client_for, settings):
    ticket = new_ticket(author, settings)
    client = client_for(author)
    assert kinds_for(client, ticket) == []

    reply(ticket, admin_user, "Hi Priya, your payout is scheduled.")
    item = next(i for i in client.get(FEED).data["items"] if i["ticket_id"] == ticket.id)
    assert item["kind"] == "admin_reply"
    assert item["preview"].startswith("Hi Priya")

    client.post(f"/api/v1/tickets/{ticket.id}/mark-seen/")
    assert kinds_for(client, ticket) == []

    services.update_ticket(ticket, admin_user, status=TicketStatus.RESOLVED)
    assert kinds_for(client, ticket) == ["resolved"]


def test_author_feed_never_leaks_other_authors_tickets(admin_user, author, other_author, client_for, settings):
    ticket = new_ticket(other_author, settings)
    reply(ticket, admin_user, "Reply for Rohit")
    assert kinds_for(client_for(author), ticket) == []


def test_mark_all_read_keeps_pending_resolutions(admin_user, author, client_for, settings):
    replied = new_ticket(author, settings, subject="Royalty question one")
    resolved = new_ticket(author, settings, subject="Royalty question two")
    reply(replied, admin_user, "Answer one")
    reply(resolved, admin_user, "Answer two", resolve=True)
    Ticket.objects.filter(pk=resolved.pk).update(author_last_seen_at=None)

    client = client_for(author)
    assert client.post(f"{FEED}mark-all-read/").status_code == 204
    feed = client.get(FEED).data
    assert kinds_for(client, replied) == []
    assert kinds_for(client, resolved) == ["resolved"]
    assert feed["count"] == len(feed["items"])


def test_feed_requires_authentication(client_for):
    assert client_for().get(FEED).status_code == 401
