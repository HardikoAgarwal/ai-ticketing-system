import json

import openai
import pytest

from apps.ai import budget, circuit_breaker, fallback
from apps.ai.models import AIDraft, AIRequestLog
from apps.jobs import runner
from apps.jobs.models import Job, JobStatus
from apps.tickets import services
from apps.tickets.models import AIStatus, MessageKind
from tests.conftest import url


def new_ticket(ws, customer, record=None, **kw):
    return services.create_ticket(
        workspace=ws, requester=customer, record=record,
        subject=kw.get("subject", "Refund for annual plan"),
        description=kw.get("description", "Please refund my annual plan, I was charged yesterday."),
    )


def timeout_error():
    return openai.APITimeoutError(request=None)


def test_pipeline_triage_then_grounded_draft(ws, customer, record, article, fake_openai, django_capture_on_commit_callbacks):
    fake_openai.push_triage("billing", "HIGH", sentiment="NEGATIVE", summary="Wants an annual refund.")
    fake_openai.push("Hi Cat,\n\nHappy to help with the refund.\n\nWarm regards,\nAcme Support")
    with django_capture_on_commit_callbacks(execute=True):
        t = new_ticket(ws, customer, record)
    t.refresh_from_db()
    assert t.ai_status == AIStatus.COMPLETED and t.ai_draft_status == AIStatus.COMPLETED
    assert t.category.key == "billing" and t.priority == "HIGH" and t.sentiment == "NEGATIVE"
    assert t.ai_summary == "Wants an annual refund."
    draft = AIDraft.objects.get(ticket=t)
    assert [c["title"] for c in draft.citations] == ["Refund policy"]
    prompt = fake_openai.calls[1]["messages"][1]["content"]
    assert "Annual plans can be refunded within 14 days" in prompt  # KB retrieved
    assert "Renewal date: 01 Jan 2027" in prompt  # deterministic fact sheet
    assert "Customer first name: Cat" in prompt
    assert fake_openai.calls[0]["response_format"]["json_schema"]["schema"]["properties"]["category"]["enum"] == [
        c.key for c in ws.categories.all()
    ]


def test_internal_notes_never_enter_prompt(ws, customer, agent, article, fake_openai, django_capture_on_commit_callbacks):
    fake_openai.push_triage("billing", "MEDIUM")
    with django_capture_on_commit_callbacks(execute=True):
        t = new_ticket(ws, customer)
    services.post_staff_message(t, agent, body="TOP SECRET internal thought", kind=MessageKind.NOTE)
    from apps.ai.drafter import build_inputs

    prompt = json.dumps(build_inputs(t).messages)
    assert "TOP SECRET" not in prompt


def test_draft_is_cached_until_inputs_change(ws, customer, agent, article, fake_openai, django_capture_on_commit_callbacks):
    fake_openai.push_triage("billing", "MEDIUM")
    with django_capture_on_commit_callbacks(execute=True):
        t = new_ticket(ws, customer)
    calls = len(fake_openai.calls)
    from apps.ai.drafter import generate_draft

    generate_draft(t)
    assert len(fake_openai.calls) == calls  # cache hit
    generate_draft(t, force=True)
    assert len(fake_openai.calls) == calls + 1  # forced regeneration


def test_transient_failure_retries_then_succeeds(ws, customer, article, fake_openai, django_capture_on_commit_callbacks):
    fake_openai.push(exc=timeout_error())
    fake_openai.push_triage("billing", "HIGH")
    with django_capture_on_commit_callbacks(execute=True):
        t = new_ticket(ws, customer)
    t.refresh_from_db()
    assert t.ai_status == AIStatus.PENDING  # rescheduled, not failed
    job = Job.objects.get(name="ai.classify")
    assert job.status == JobStatus.PENDING and job.attempts == 1
    Job.objects.filter(pk=job.pk).update(run_at=job.run_at.replace(year=2000))
    assert runner.sweep() >= 1
    t.refresh_from_db()
    assert t.ai_status == AIStatus.COMPLETED and t.priority == "HIGH"


def test_persistent_outage_falls_back_to_rules(ws, customer, fake_openai, django_capture_on_commit_callbacks):
    for _ in range(4):
        fake_openai.push(exc=timeout_error())
    with django_capture_on_commit_callbacks(execute=True):
        t = new_ticket(ws, customer)
    for _ in range(4):
        Job.objects.filter(status=JobStatus.PENDING).update(run_at="2000-01-01T00:00:00Z")
        runner.sweep()
    t.refresh_from_db()
    assert t.ai_status == AIStatus.FAILED and t.ai_draft_status == AIStatus.FAILED
    assert t.category is not None  # rule-based category survives


def test_permanent_error_not_retried(ws, customer, fake_openai, django_capture_on_commit_callbacks):
    fake_openai.push("not json at all")
    with django_capture_on_commit_callbacks(execute=True):
        t = new_ticket(ws, customer)
    t.refresh_from_db()
    assert t.ai_status == AIStatus.FAILED and "Invalid triage output" in t.ai_error
    assert len(fake_openai.calls) == 1


def test_unknown_category_from_model_is_rejected(ws, customer, fake_openai, django_capture_on_commit_callbacks):
    fake_openai.push_triage("nonexistent", "HIGH")
    with django_capture_on_commit_callbacks(execute=True):
        t = new_ticket(ws, customer)
    t.refresh_from_db()
    assert t.ai_status == AIStatus.FAILED


def test_circuit_breaker_opens_after_repeated_failures(ws, customer, fake_openai, settings):
    settings.AI_CIRCUIT_FAILURE_THRESHOLD = 2
    from apps.ai import client

    for _ in range(2):
        fake_openai.push(exc=timeout_error())
        with pytest.raises(client.AIUnavailableError):
            client.chat(feature="CLASSIFY", messages=[], prompt_version="t", max_tokens=5)
    assert circuit_breaker.is_open()
    n = len(fake_openai.calls)
    with pytest.raises(client.AIUnavailableError):
        client.chat(feature="CLASSIFY", messages=[], prompt_version="t", max_tokens=5)
    assert len(fake_openai.calls) == n  # failed fast, no API call


def test_ai_disabled_workspace_skips_pipeline(ws, customer, fake_openai, django_capture_on_commit_callbacks):
    ws.ai_enabled = False
    ws.save()
    with django_capture_on_commit_callbacks(execute=True):
        t = new_ticket(ws, customer)
    t.refresh_from_db()
    assert t.ai_status == AIStatus.DISABLED and not fake_openai.calls


def test_daily_budget_caps_live_calls_and_degrades(ws, customer, fake_openai, settings, django_capture_on_commit_callbacks):
    settings.AI_WORKSPACE_DAILY_CAP = 1
    AIRequestLog.objects.create(workspace=ws, feature="DRAFT", model="m", prompt_version="v")
    with django_capture_on_commit_callbacks(execute=True):
        t = new_ticket(ws, customer)
    t.refresh_from_db()
    assert t.ai_status == AIStatus.FAILED and "budget" in t.ai_error.lower()
    assert not fake_openai.calls
    assert budget.usage(ws.id)["workspace_used"] == 1


def test_regenerate_endpoint_and_draft_payload(client_for, ws, customer, agent, article, fake_openai, django_capture_on_commit_callbacks):
    fake_openai.push_triage("billing", "MEDIUM")
    with django_capture_on_commit_callbacks(execute=True):
        t = new_ticket(ws, customer)
    c = client_for(agent)
    resp = c.get(url(ws, f"tickets/{t.id}/draft/"))
    assert resp.data["status"] == "ready" and resp.data["draft"]["citations"][0]["title"] == "Refund policy"
    fake_openai.push("A fresh draft")
    with django_capture_on_commit_callbacks(execute=True):
        assert c.post(url(ws, f"tickets/{t.id}/draft/regenerate/")).status_code == 202
    assert c.get(url(ws, f"tickets/{t.id}/draft/")).data["draft"]["content"] == "A fresh draft"
    assert client_for(customer).get(url(ws, f"tickets/{t.id}/draft/")).status_code == 403


def test_sent_message_records_draft_usage(client_for, ws, customer, agent, article, fake_openai, django_capture_on_commit_callbacks):
    fake_openai.push_triage("billing", "MEDIUM")
    with django_capture_on_commit_callbacks(execute=True):
        t = new_ticket(ws, customer)
    draft = AIDraft.objects.get(ticket=t)
    c = client_for(agent)
    resp = c.post(url(ws, f"tickets/{t.id}/messages/"), {"body": draft.content, "ai_draft_id": draft.id}, format="json")
    assert resp.data["ai_draft_edited"] is False
    resp = c.post(url(ws, f"tickets/{t.id}/messages/"), {"body": draft.content + " edited", "ai_draft_id": draft.id}, format="json")
    assert resp.data["ai_draft_edited"] is True


def test_fallback_uses_workspace_categories_and_urgency(ws):
    r = fallback.classify(ws, "Charged twice", "I was charged twice for the same invoice and need a refund.")
    assert r.category.key == "billing" and r.priority == "CRITICAL"
    r = fallback.classify(ws, "Login", "I cannot log in, locked out of everything.")
    assert r.category.key == "account" and r.priority == "CRITICAL"
    r = fallback.classify(ws, "Hello", "How do I invite my team and set up a tutorial?")
    assert r.priority == "LOW"
    r = fallback.classify(ws, "Hmm", "Something odd happened yesterday afternoon honestly.")
    assert r.category.is_default and r.priority == "MEDIUM"


def test_similar_tickets_use_embeddings(client_for, ws, customer, agent, fake_openai, django_capture_on_commit_callbacks):
    fake_openai.push_triage("billing", "MEDIUM")
    fake_openai.push_triage("billing", "MEDIUM")
    with django_capture_on_commit_callbacks(execute=True):
        a = new_ticket(ws, customer, subject="Refund request one", description="Please refund me for the annual plan.")
        b = new_ticket(ws, customer, subject="Refund request two", description="Please refund my annual subscription too.")
    a.refresh_from_db()
    assert a.embedding  # stored by the pipeline
    hits = client_for(agent).get(url(ws, f"tickets/{a.id}/similar/")).data
    assert [h["id"] for h in hits] == [b.id]
