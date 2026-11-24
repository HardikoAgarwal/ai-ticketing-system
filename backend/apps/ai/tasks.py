"""Background AI pipeline (runs on the in-process job pool).

Ticket creation never waits on these. Transient failures retry with backoff; when retries are
exhausted, or the free-tier budget is spent, the ticket keeps its rule-based triage and staff
reply manually.
"""

import logging

from apps.jobs import runner
from apps.tickets import services
from apps.tickets.models import AIStatus, Ticket

from .classifier import classify_ticket
from .client import AIBudgetError, AIError, AIPermanentError, AIUnavailableError
from .drafter import generate_draft

logger = logging.getLogger(__name__)


def _backoff(attempt: int) -> int:
    return min(60, 5 * (2 ** max(attempt - 1, 0)))


def _get(ticket_id: int) -> Ticket | None:
    return Ticket.objects.select_related("workspace", "requester", "record", "category").filter(pk=ticket_id).first()


def _attempt(ticket_id: int) -> int:
    from apps.jobs.models import Job

    job = Job.objects.filter(name__startswith="ai.", payload__ticket_id=ticket_id, status="RUNNING").order_by("-id").first()
    return job.attempts if job else 1


def _embed_ticket(ticket) -> None:
    """Store the ticket's embedding for duplicate detection. Best-effort: never fails the pipeline."""
    from . import client

    try:
        vector = client.embed(
            [f"{ticket.subject}\n{ticket.description}"[:2000]], workspace_id=ticket.workspace_id, ticket_id=ticket.id
        )[0]
    except AIError as exc:
        logger.info("Ticket %s embedding skipped: %s", ticket.id, exc)
        return
    Ticket.objects.filter(pk=ticket.pk).update(embedding=vector)


def _fail_classification(error: str, ticket_id: int, **_):
    ticket = _get(ticket_id)
    if ticket:
        services.mark_ai_failed(ticket, error)


def _fail_draft(error: str, ticket_id: int, **_):
    ticket = _get(ticket_id)
    if ticket:
        services.set_draft_status(ticket, AIStatus.FAILED, error)


@runner.task("ai.classify", on_exhausted=_fail_classification)
def classify_job(ticket_id: int, then_draft: bool = False):
    ticket = _get(ticket_id)
    if not ticket:
        return
    try:
        result = classify_ticket(ticket)
    except AIBudgetError as exc:
        services.mark_ai_failed(ticket, f"{exc} Showing rule-based triage instead.")
        return
    except AIUnavailableError as exc:
        raise runner.Retry(f"AI unavailable: {exc}", delay=_backoff(_attempt(ticket_id))) from exc
    except AIPermanentError as exc:
        services.mark_ai_failed(ticket, str(exc))
        return

    category = ticket.workspace.categories.filter(key=result.category_key).first()
    ticket = services.apply_ai_classification(
        ticket,
        category=category,
        priority=result.priority,
        confidence=result.confidence,
        reasoning=result.reasoning,
        sentiment=result.sentiment,
        summary=result.summary,
    )
    _embed_ticket(ticket)
    if then_draft:
        runner.enqueue("ai.draft", ticket_id=ticket.id)


@runner.task("ai.draft", on_exhausted=_fail_draft)
def draft_job(ticket_id: int, force: bool = False):
    ticket = _get(ticket_id)
    if not ticket:
        return
    try:
        generate_draft(ticket, force=force)
    except AIBudgetError as exc:
        services.set_draft_status(ticket, AIStatus.FAILED, f"{exc} Write the reply manually.")
        return
    except AIUnavailableError as exc:
        raise runner.Retry(f"AI unavailable: {exc}", delay=_backoff(_attempt(ticket_id))) from exc
    except AIPermanentError as exc:
        services.set_draft_status(ticket, AIStatus.FAILED, str(exc))
        return
    services.set_draft_status(ticket, AIStatus.COMPLETED)
