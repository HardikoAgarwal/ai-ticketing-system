from datetime import timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.tickets import services
from apps.tickets.models import ClassificationSource, MessageKind, Ticket, TicketPriority, TicketStatus

pytestmark = pytest.mark.django_db


def create(client, **data):
    payload = {"subject": "Royalty not received", "description": "My royalty for last quarter has not arrived yet."}
    payload.update(data)
    return client.post("/api/v1/tickets/", payload, format="multipart")


def test_author_creates_ticket_with_fallback_classification(author, author_book, client_for, settings):
    settings.AI_ENABLED = False
    res = create(client_for(author), book_id=author_book.id)
    assert res.status_code == 201, res.data
    ticket = Ticket.objects.get(pk=res.data["id"])
    assert ticket.category == "ROYALTY_PAYMENTS"
    assert ticket.category_source == ClassificationSource.FALLBACK
    assert ticket.sla_due_at is not None
    assert ticket.status == TicketStatus.OPEN


def test_general_ticket_without_book(author, client_for, settings):
    settings.AI_ENABLED = False
    res = create(client_for(author), subject="Update my author bio", description="How can I update the bio on my author page?")
    assert res.status_code == 201
    assert res.data["book"] is None


def test_cannot_file_ticket_against_someone_elses_book(author, other_author, client_for):
    foreign = other_author.author_profile.books.first()
    res = create(client_for(author), book_id=foreign.id)
    assert res.status_code == 400
    assert res.data["error"]["code"] == "validation_error"
    assert "book_id" in res.data["error"]["details"]


def test_validation_errors_are_meaningful(author, client_for):
    res = create(client_for(author), subject="Hi", description="short")
    assert res.status_code == 400
    assert {"subject", "description"} <= set(res.data["error"]["details"])


def test_rejects_unsupported_attachment(author, client_for):
    bad = SimpleUploadedFile("payload.exe", b"MZ...", content_type="application/x-msdownload")
    res = create(client_for(author), attachments=[bad])
    assert res.status_code == 400


def test_accepts_pdf_attachment(author, client_for, settings):
    settings.AI_ENABLED = False
    pdf = SimpleUploadedFile("statement.pdf", b"%PDF-1.4 test", content_type="application/pdf")
    res = create(client_for(author), attachments=[pdf])
    assert res.status_code == 201
    assert Ticket.objects.get(pk=res.data["id"]).attachments.count() == 1


def test_admin_override_marks_source_and_recomputes_sla(author, admin_user, client_for, settings):
    settings.AI_ENABLED = False
    ticket = services.create_ticket(author_user=author, subject="Question about cover", description="c" * 30)
    res = client_for(admin_user).patch(f"/api/v1/tickets/{ticket.id}/", {"priority": "CRITICAL", "category": "BOOK_STATUS"}, format="json")
    assert res.status_code == 200
    ticket.refresh_from_db()
    assert ticket.priority == TicketPriority.CRITICAL and ticket.priority_source == ClassificationSource.ADMIN
    assert ticket.category_source == ClassificationSource.ADMIN
    assert ticket.sla_due_at - ticket.created_at == timedelta(hours=4)


def test_ai_never_overrides_admin_choice(author, admin_user, settings):
    settings.AI_ENABLED = False
    ticket = services.create_ticket(author_user=author, subject="Question about cover", description="c" * 30)
    services.update_ticket(ticket, admin_user, priority=TicketPriority.LOW)
    services.apply_ai_classification(ticket, category="GENERAL", priority="CRITICAL", confidence=0.9, reasoning="r")
    ticket.refresh_from_db()
    assert ticket.priority == TicketPriority.LOW
    assert ticket.ai_priority == "CRITICAL"


def test_invalid_status_transition_is_rejected(author, admin_user, client_for, settings):
    settings.AI_ENABLED = False
    ticket = services.create_ticket(author_user=author, subject="Question", description="q" * 30)
    services.update_ticket(ticket, admin_user, status=TicketStatus.CLOSED)
    res = client_for(admin_user).patch(f"/api/v1/tickets/{ticket.id}/", {"status": "RESOLVED"}, format="json")
    assert res.status_code == 409
    assert res.data["error"]["code"]


def test_admin_reply_sets_first_response_and_progresses(author, admin_user, client_for, settings):
    settings.AI_ENABLED = False
    ticket = services.create_ticket(author_user=author, subject="Distribution question", description="d" * 30)
    res = client_for(admin_user).post(f"/api/v1/tickets/{ticket.id}/messages/", {"body": "Looking into it.", "kind": "REPLY"}, format="json")
    assert res.status_code == 201
    ticket.refresh_from_db()
    assert ticket.first_response_at is not None
    assert ticket.status == TicketStatus.IN_PROGRESS
    assert ticket.assigned_to == admin_user


def test_internal_note_does_not_count_as_first_response(author, admin_user, settings):
    settings.AI_ENABLED = False
    ticket = services.create_ticket(author_user=author, subject="Distribution question", description="d" * 30)
    services.post_admin_message(ticket, admin_user, body="note", kind=MessageKind.NOTE)
    ticket.refresh_from_db()
    assert ticket.first_response_at is None
    assert ticket.status == TicketStatus.OPEN


def test_author_reply_reopens_resolved_ticket(author, admin_user, client_for, settings):
    settings.AI_ENABLED = False
    ticket = services.create_ticket(author_user=author, subject="Printing issue", description="p" * 30)
    services.post_admin_message(ticket, admin_user, body="Fixed!", kind=MessageKind.REPLY, resolve=True)
    ticket.refresh_from_db()
    assert ticket.status == TicketStatus.RESOLVED
    res = client_for(author).post(f"/api/v1/tickets/{ticket.id}/messages/", {"body": "Still broken."}, format="json")
    assert res.status_code == 201
    ticket.refresh_from_db()
    assert ticket.status == TicketStatus.IN_PROGRESS


def test_queue_filters_and_ordering(author, admin_user, client_for, settings):
    settings.AI_ENABLED = False
    low = services.create_ticket(author_user=author, subject="Bio update", description="How do I update my author bio please?")
    crit = services.create_ticket(author_user=author, subject="Royalty", description="royalty payment not received for 6 months, unacceptable")
    services.update_ticket(low, admin_user, priority=TicketPriority.LOW)
    services.update_ticket(crit, admin_user, priority=TicketPriority.CRITICAL)

    client = client_for(admin_user)
    ids = [t["id"] for t in client.get("/api/v1/tickets/").data["results"]]
    assert ids.index(crit.id) < ids.index(low.id)

    only_low = client.get("/api/v1/tickets/?priority=LOW").data["results"]
    assert {t["id"] for t in only_low} == {low.id}
    assert client.get(f"/api/v1/tickets/?q={crit.reference}").data["count"] == 1


def test_analytics_summary(admin_user, client_for):
    res = client_for(admin_user).get("/api/v1/admin/analytics/summary/?days=7")
    assert res.status_code == 200
    assert res.data["range_days"] == 7
    assert len(res.data["volume"]) == 8
