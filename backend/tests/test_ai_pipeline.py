import httpx2 as httpx
import openai
import pytest

from apps.ai import circuit_breaker
from apps.ai.drafter import build_inputs, generate_draft
from apps.ai.models import AIDraft, AIRequestLog
from apps.tickets import services
from apps.tickets.models import AIStatus, ClassificationSource, MessageKind

pytestmark = pytest.mark.django_db


def _timeout():
    return openai.APITimeoutError(request=httpx.Request("POST", "https://api.openai.com/v1/chat/completions"))


def _bad_request():
    request = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")
    return openai.BadRequestError("bad", response=httpx.Response(400, request=request), body=None)


@pytest.fixture
def no_backoff(monkeypatch):
    monkeypatch.setattr("apps.ai.tasks._backoff", lambda retries: 0)


def make_ticket(author, book=None, django_capture_on_commit_callbacks=None):
    with django_capture_on_commit_callbacks(execute=True):
        return services.create_ticket(
            author_user=author,
            book=book,
            subject="Royalty not received",
            description="My royalty payment for last quarter has not arrived. Can you check?",
        )


def test_pipeline_classifies_then_drafts(author, author_book, fake_openai, django_capture_on_commit_callbacks):
    fake_openai.push_classification("ROYALTY_PAYMENTS", "HIGH", 0.92, "Author reports missing royalty payment.")
    fake_openai.push("Hi Priya,\n\nThanks for reaching out...\n\nWarm regards,\nBookLeaf Author Support")

    ticket = make_ticket(author, author_book, django_capture_on_commit_callbacks)
    ticket.refresh_from_db()

    assert ticket.ai_status == AIStatus.COMPLETED
    assert (ticket.category, ticket.priority) == ("ROYALTY_PAYMENTS", "HIGH")
    assert ticket.category_source == ClassificationSource.AI
    assert ticket.ai_confidence == pytest.approx(0.92)
    assert ticket.ai_draft_status == AIStatus.COMPLETED
    draft = AIDraft.objects.get(ticket=ticket)
    assert any("royalt" in s["key"] for s in draft.kb_sections)

    assert AIRequestLog.objects.filter(ticket=ticket, success=True).count() == 2
    assert all(log.cost_usd > 0 for log in AIRequestLog.objects.all())

    classify_call, draft_call = fake_openai.calls
    assert classify_call["response_format"]["type"] == "json_schema"
    assert classify_call["model"] == "gpt-4o-mini"
    draft_prompt = " ".join(m["content"] for m in draft_call["messages"])
    assert "Warm regards" in draft_prompt
    assert author_book.title in draft_prompt


def test_transient_failure_retries_then_succeeds(author, fake_openai, no_backoff, django_capture_on_commit_callbacks):
    fake_openai.push(exc=_timeout())
    fake_openai.push_classification("GENERAL", "LOW")
    fake_openai.push("Draft")

    ticket = make_ticket(author, None, django_capture_on_commit_callbacks)
    ticket.refresh_from_db()
    assert ticket.ai_status == AIStatus.COMPLETED
    assert AIRequestLog.objects.filter(success=False, error_type="APITimeoutError").count() == 1


def test_persistent_outage_degrades_gracefully(author, fake_openai, no_backoff, django_capture_on_commit_callbacks):
    for _ in range(10):
        fake_openai.push(exc=_timeout())

    ticket = make_ticket(author, None, django_capture_on_commit_callbacks)
    ticket.refresh_from_db()

    assert ticket.ai_status == AIStatus.FAILED
    assert ticket.category == "ROYALTY_PAYMENTS"
    assert ticket.category_source == ClassificationSource.FALLBACK
    assert ticket.sla_due_at is not None


def test_permanent_error_is_not_retried(author, fake_openai, no_backoff, django_capture_on_commit_callbacks):
    fake_openai.push(exc=_bad_request())
    ticket = make_ticket(author, None, django_capture_on_commit_callbacks)
    ticket.refresh_from_db()
    assert ticket.ai_status == AIStatus.FAILED
    assert len(fake_openai.calls) == 1


def test_invalid_model_output_falls_back(author, fake_openai, django_capture_on_commit_callbacks):
    fake_openai.push('{"category": "NOT_A_CATEGORY", "priority": "HIGH", "confidence": 2, "reasoning": "x"}')
    ticket = make_ticket(author, None, django_capture_on_commit_callbacks)
    ticket.refresh_from_db()
    assert ticket.ai_status == AIStatus.FAILED
    assert ticket.category_source == ClassificationSource.FALLBACK


def test_circuit_breaker_short_circuits_calls(author, fake_openai, settings, django_capture_on_commit_callbacks):
    for _ in range(settings.AI_CIRCUIT_FAILURE_THRESHOLD):
        circuit_breaker.record_failure()
    assert circuit_breaker.is_open()
    ticket = make_ticket(author, None, django_capture_on_commit_callbacks)
    ticket.refresh_from_db()
    assert fake_openai.calls == []
    assert ticket.ai_status == AIStatus.FAILED


def test_ai_disabled_skips_calls(author, fake_openai, settings, client_for, django_capture_on_commit_callbacks):
    settings.AI_ENABLED = False
    ticket = make_ticket(author, None, django_capture_on_commit_callbacks)
    assert fake_openai.calls == []
    admin = type(author).objects.get(email="admin@bookleaf.com")
    assert client_for(admin).get(f"/api/v1/tickets/{ticket.id}/draft/").data["status"] == "disabled"


def test_draft_cache_reused_until_conversation_changes(author, admin_user, fake_openai, settings):
    settings.AI_ENABLED = True
    ticket = services.create_ticket(author_user=author, subject="ISBN issue", description="My ISBN differs on Amazon listing.")
    first = generate_draft(ticket)
    assert generate_draft(ticket).id == first.id
    assert len(fake_openai.calls) == 1

    services.post_author_message(ticket, author, body="Any update please?")
    assert build_inputs(ticket).input_hash != first.input_hash
    second = generate_draft(ticket)
    assert second.id != first.id


def test_internal_notes_never_reach_the_draft_prompt(author, admin_user, fake_openai):
    ticket = services.create_ticket(author_user=author, subject="ISBN issue", description="My ISBN differs on Amazon listing.")
    services.post_admin_message(ticket, admin_user, body="SECRET internal escalation note", kind=MessageKind.NOTE)
    prompt = " ".join(m["content"] for m in build_inputs(ticket).messages)
    assert "SECRET" not in prompt


def test_draft_prompt_uses_category_scoped_kb(author, author_book):
    ticket = services.create_ticket(
        author_user=author, book=author_book, subject="Royalty question", description="When will my pending royalty be paid out?"
    )
    inputs = build_inputs(ticket)
    keys = [s["key"] for s in inputs.kb_sections]
    assert keys and all("printing" not in k for k in keys)
