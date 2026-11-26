from apps.tickets import services
from apps.tickets.models import AIStatus, ClassificationSource, TicketStatus
from tests.conftest import url


def create(client, ws, **extra):
    payload = {"subject": "Refund for annual plan", "description": "Please refund my annual plan, I was charged yesterday.", **extra}
    return client.post(url(ws, "tickets/"), payload, format="multipart")


def test_requester_creates_ticket_with_provisional_triage(client_for, ws, customer, record, fake_openai, django_capture_on_commit_callbacks):
    fake_openai.push_triage("billing", "MEDIUM")
    with django_capture_on_commit_callbacks(execute=True):
        resp = create(client_for(customer), ws, record_id=record.id)
    assert resp.status_code == 201
    assert resp.data["reference"] == "TKT-0001"
    # requester payload never exposes triage fields
    for hidden in ("priority", "category", "ai_reasoning", "activities", "sentiment"):
        assert hidden not in resp.data


def test_ticket_numbers_are_per_workspace(client_for, ws, other_ws, customer, outsider, db):
    a = services.create_ticket(workspace=ws, requester=customer, subject="First one", description="First ticket description here.")
    b = services.create_ticket(workspace=ws, requester=customer, subject="Second one", description="Second ticket description here.")
    from tests.conftest import make_user

    c = make_user("x@other.test", "X", other_ws)
    d = services.create_ticket(workspace=other_ws, requester=c, subject="Other first", description="Other workspace first ticket.")
    assert (a.number, b.number, d.number) == (1, 2, 1)


def test_cannot_raise_ticket_about_someone_elses_record(client_for, ws, other_customer, record):
    resp = create(client_for(other_customer), ws, record_id=record.id)
    assert resp.status_code == 400


def test_requesters_only_see_own_tickets(client_for, ws, customer, other_customer):
    mine = services.create_ticket(workspace=ws, requester=customer, subject="Mine mine", description="This is my own ticket text.")
    theirs = services.create_ticket(workspace=ws, requester=other_customer, subject="Theirs", description="This belongs to somebody else.")
    c = client_for(customer)
    ids = {t["id"] for t in c.get(url(ws, "tickets/")).data["results"]}
    assert ids == {mine.id}
    assert c.get(url(ws, f"tickets/{theirs.id}/")).status_code == 404


def test_internal_notes_never_reach_requester(client_for, ws, customer, agent):
    t = services.create_ticket(workspace=ws, requester=customer, subject="Broken thing", description="Something is broken in the app.")
    staff = client_for(agent)
    assert staff.post(url(ws, f"tickets/{t.id}/messages/"), {"body": "secret internal note", "kind": "NOTE"}, format="json").status_code == 201
    assert staff.post(url(ws, f"tickets/{t.id}/messages/"), {"body": "Hi, looking into it now."}, format="json").status_code == 201
    detail = client_for(customer).get(url(ws, f"tickets/{t.id}/")).data
    bodies = [m["body"] for m in detail["messages"]]
    assert "secret internal note" not in bodies and "Hi, looking into it now." in bodies
    listing = client_for(customer).get(url(ws, f"tickets/{t.id}/messages/")).data
    assert all(m["kind"] == "REPLY" for m in listing)


def test_requester_cannot_post_notes_or_update(client_for, ws, customer):
    t = services.create_ticket(workspace=ws, requester=customer, subject="Hello there", description="A question about my plan details.")
    c = client_for(customer)
    assert c.post(url(ws, f"tickets/{t.id}/messages/"), {"body": "x", "kind": "NOTE"}, format="json").status_code == 403
    assert c.patch(url(ws, f"tickets/{t.id}/"), {"priority": "LOW"}, format="json").status_code == 403


def test_status_machine_and_conflicts(client_for, ws, customer, agent):
    t = services.create_ticket(workspace=ws, requester=customer, subject="Hello there", description="A question about my plan details.")
    staff = client_for(agent)
    assert staff.patch(url(ws, f"tickets/{t.id}/"), {"status": "RESOLVED"}, format="json").status_code == 200
    assert staff.patch(url(ws, f"tickets/{t.id}/"), {"status": "CLOSED"}, format="json").status_code == 200
    resp = staff.patch(url(ws, f"tickets/{t.id}/"), {"status": "RESOLVED"}, format="json")
    assert resp.status_code == 409 and resp.data["error"]["code"] == "invalid_transition"


def test_first_reply_sets_sla_assignment_and_status(client_for, ws, customer, agent):
    t = services.create_ticket(workspace=ws, requester=customer, subject="Hello there", description="A question about my plan details.")
    client_for(agent).post(url(ws, f"tickets/{t.id}/messages/"), {"body": "On it."}, format="json")
    t.refresh_from_db()
    assert t.first_response_at and t.assigned_to == agent and t.status == TicketStatus.IN_PROGRESS
    assert t.sla_state == "met"


def test_requester_reply_reopens_resolved_ticket(client_for, ws, customer, agent):
    t = services.create_ticket(workspace=ws, requester=customer, subject="Hello there", description="A question about my plan details.")
    services.update_ticket(t, agent, status="RESOLVED")
    client_for(customer).post(url(ws, f"tickets/{t.id}/messages/"), {"body": "Still broken, sorry."}, format="json")
    t.refresh_from_db()
    assert t.status == TicketStatus.IN_PROGRESS


def test_confirm_resolution_and_csat(client_for, ws, customer, agent):
    t = services.create_ticket(workspace=ws, requester=customer, subject="Hello there", description="A question about my plan details.")
    c = client_for(customer)
    assert c.post(url(ws, f"tickets/{t.id}/csat/"), {"score": 5}, format="json").status_code == 409  # not resolved yet
    services.update_ticket(t, agent, status="RESOLVED")
    assert c.post(url(ws, f"tickets/{t.id}/confirm-resolution/"), {"resolved": True}, format="json").status_code == 200
    assert c.post(url(ws, f"tickets/{t.id}/csat/"), {"score": 5, "comment": "Great"}, format="json").status_code == 200
    t.refresh_from_db()
    assert t.status == TicketStatus.CLOSED and t.csat_score == 5


def test_assign_only_to_team_members(client_for, ws, customer, agent, other_customer):
    t = services.create_ticket(workspace=ws, requester=customer, subject="Hello there", description="A question about my plan details.")
    staff = client_for(agent)
    assert staff.patch(url(ws, f"tickets/{t.id}/"), {"assigned_to": other_customer.id}, format="json").status_code == 400
    assert staff.patch(url(ws, f"tickets/{t.id}/"), {"assigned_to": agent.id}, format="json").status_code == 200
    assert staff.patch(url(ws, f"tickets/{t.id}/"), {"assigned_to": None}, format="json").data["assigned_to"] is None


def test_filters_and_search(client_for, ws, customer, agent):
    a = services.create_ticket(workspace=ws, requester=customer, subject="Invoice question", description="Why is my invoice higher this month?")
    services.create_ticket(workspace=ws, requester=customer, subject="Login problem", description="I cannot log in with my password at all.")
    staff = client_for(agent)
    assert len(staff.get(url(ws, "tickets/?q=invoice")).data["results"]) == 1
    assert staff.get(url(ws, "tickets/?q=TKT-0001")).data["results"][0]["id"] == a.id
    assert len(staff.get(url(ws, "tickets/?category=billing")).data["results"]) >= 1
    stats = staff.get(url(ws, "tickets/stats/")).data
    assert stats["open"] == 2 and stats["unassigned"] == 2


def test_notifications_follow_read_state(client_for, ws, customer, agent):
    t = services.create_ticket(workspace=ws, requester=customer, subject="Hello there", description="A question about my plan details.")
    staff = client_for(agent)
    feed = staff.get(url(ws, "tickets/notifications/")).data
    assert feed["count"] == 1 and feed["items"][0]["kind"] == "new_ticket"
    staff.post(url(ws, f"tickets/{t.id}/mark-seen/"))
    assert staff.get(url(ws, "tickets/notifications/")).data["count"] == 0
    staff.post(url(ws, f"tickets/{t.id}/messages/"), {"body": "Replying now."}, format="json")
    cust = client_for(customer).get(url(ws, "tickets/notifications/")).data
    assert cust["count"] == 1 and cust["items"][0]["kind"] == "staff_reply"


def test_staff_override_beats_ai(client_for, ws, customer, agent, fake_openai, django_capture_on_commit_callbacks):
    fake_openai.push_triage("technical", "LOW")
    with django_capture_on_commit_callbacks(execute=True):
        t = services.create_ticket(workspace=ws, requester=customer, subject="Hello there", description="A question about my plan details.")
    t.refresh_from_db()
    assert t.category.key == "technical" and t.category_source == ClassificationSource.AI and t.priority == "LOW"
    billing = ws.categories.get(key="billing")
    services.update_ticket(t, agent, category=billing, priority="CRITICAL")
    services.apply_ai_classification(t, category=ws.categories.get(key="technical"), priority="LOW", confidence=0.5, reasoning="again")
    t.refresh_from_db()
    assert t.category_id == billing.id and t.priority == "CRITICAL" and t.ai_status == AIStatus.COMPLETED


# ---------------------------------------------------------------------------- auto-close

from datetime import timedelta  # noqa: E402

from django.utils import timezone  # noqa: E402

from apps.tickets.models import ActivityAction, Ticket  # noqa: E402


def _resolved_ticket(ws, customer, agent, days_ago):
    t = services.create_ticket(workspace=ws, requester=customer, subject="Hello there", description="A question about my plan details.")
    services.update_ticket(t, agent, status="RESOLVED")
    Ticket.objects.filter(pk=t.pk).update(resolved_at=timezone.now() - timedelta(days=days_ago))
    return t


def test_auto_close_closes_only_old_resolved_tickets(ws, customer, agent):
    old = _resolved_ticket(ws, customer, agent, days_ago=8)
    recent = _resolved_ticket(ws, customer, agent, days_ago=2)
    assert services.auto_close_resolved(ws) == 1
    old.refresh_from_db()
    recent.refresh_from_db()
    assert old.status == TicketStatus.CLOSED and old.closed_at is not None
    assert recent.status == TicketStatus.RESOLVED
    activity = old.activities.filter(action=ActivityAction.AUTO_CLOSED).get()
    assert activity.actor is None and "7 days" in activity.to_value


def test_auto_close_can_be_switched_off_and_respects_the_period(ws, customer, agent):
    t = _resolved_ticket(ws, customer, agent, days_ago=20)
    ws.auto_close_days = 0
    ws.save(update_fields=["auto_close_days"])
    assert services.auto_close_resolved(ws) == 0
    ws.auto_close_days = 30
    ws.save(update_fields=["auto_close_days"])
    assert services.auto_close_resolved(ws) == 0  # 20 days is inside a 30 day window
    ws.auto_close_days = 14
    ws.save(update_fields=["auto_close_days"])
    assert services.auto_close_resolved(ws) == 1
    t.refresh_from_db()
    assert t.status == TicketStatus.CLOSED


def test_auto_close_never_touches_active_tickets(ws, customer, agent):
    t = services.create_ticket(workspace=ws, requester=customer, subject="Hello there", description="A question about my plan details.")
    Ticket.objects.filter(pk=t.pk).update(created_at=timezone.now() - timedelta(days=60))
    assert services.auto_close_resolved(ws) == 0
    t.refresh_from_db()
    assert t.status == TicketStatus.OPEN


def test_auto_close_setting_is_validated_and_manager_only(client_for, ws, owner, agent):
    assert client_for(owner).patch(url(ws, ""), {"auto_close_days": 3}, format="json").data["auto_close_days"] == 3
    assert client_for(owner).patch(url(ws, ""), {"auto_close_days": 0}, format="json").status_code == 200
    assert client_for(owner).patch(url(ws, ""), {"auto_close_days": 500}, format="json").status_code == 400
    assert client_for(agent).patch(url(ws, ""), {"auto_close_days": 3}, format="json").status_code == 403


def test_saving_the_setting_runs_a_pass_now(client_for, ws, owner, customer, agent, django_capture_on_commit_callbacks):
    t = _resolved_ticket(ws, customer, agent, days_ago=10)
    with django_capture_on_commit_callbacks(execute=True):
        client_for(owner).patch(url(ws, ""), {"auto_close_days": 5}, format="json")
    t.refresh_from_db()
    assert t.status == TicketStatus.CLOSED


def test_history_filters_and_ordering(client_for, ws, customer, agent):
    a = _resolved_ticket(ws, customer, agent, days_ago=1)
    b = _resolved_ticket(ws, customer, agent, days_ago=40)
    staff = client_for(agent)
    since = (timezone.now() - timedelta(days=10)).isoformat()
    ids = [r["id"] for r in staff.get(url(ws, "tickets/"), {"status": "RESOLVED,CLOSED", "resolved_after": since}).data["results"]]
    assert ids == [a.id]
    ordered = [r["id"] for r in staff.get(url(ws, "tickets/"), {"status": "RESOLVED,CLOSED", "ordering": "-resolved_at"}).data["results"]]
    assert ordered == [a.id, b.id]
