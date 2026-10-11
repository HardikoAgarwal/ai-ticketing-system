"""Celery tasks for the AI pipeline.

Ticket creation never waits on these. Transient failures retry with
exponential backoff; when retries are exhausted the ticket keeps its
rule-based classification and admins reply manually.
"""

import logging

from celery import shared_task
from kombu.exceptions import OperationalError

from apps.tickets import services
from apps.tickets.models import AIStatus, Ticket

from .classifier import classify_ticket
from .client import AIPermanentError, AIUnavailableError
from .drafter import generate_draft

logger = logging.getLogger(__name__)

MAX_RETRIES = 3


def _backoff(retries: int) -> int:
    return min(60, 5 * (2**retries))


def _get(ticket_id: int) -> Ticket | None:
    return Ticket.objects.select_related("author__user", "book").filter(pk=ticket_id).first()


@shared_task(bind=True, max_retries=MAX_RETRIES, acks_late=True)
def classify_ticket_task(self, ticket_id: int, then_draft: bool = True):
    ticket = _get(ticket_id)
    if not ticket:
        return
    try:
        result = classify_ticket(ticket)
    except AIUnavailableError as exc:
        if self.request.retries < MAX_RETRIES:
            raise self.retry(exc=exc, countdown=_backoff(self.request.retries))
        services.mark_ai_failed(ticket, f"AI unavailable: {exc}")
        return
    except AIPermanentError as exc:
        services.mark_ai_failed(ticket, str(exc))
        return

    ticket = services.apply_ai_classification(
        ticket,
        category=result.category,
        priority=result.priority,
        confidence=result.confidence,
        reasoning=result.reasoning,
    )
    if then_draft:
        generate_draft_task.delay(ticket.id)


@shared_task(bind=True, max_retries=MAX_RETRIES, acks_late=True)
def generate_draft_task(self, ticket_id: int, force: bool = False):
    ticket = _get(ticket_id)
    if not ticket:
        return
    try:
        generate_draft(ticket, force=force)
    except AIUnavailableError as exc:
        if self.request.retries < MAX_RETRIES:
            raise self.retry(exc=exc, countdown=_backoff(self.request.retries))
        services.set_draft_status(ticket, AIStatus.FAILED, f"AI unavailable: {exc}")
        return
    except AIPermanentError as exc:
        services.set_draft_status(ticket, AIStatus.FAILED, str(exc))
        return
    services.set_draft_status(ticket, AIStatus.COMPLETED)


# --- Enqueue helpers: a broker outage must never break the API request. -------


def _safe_delay(task, ticket_id: int, on_fail, **kwargs) -> None:
    try:
        task.delay(ticket_id, **kwargs)
    except (OperationalError, ConnectionError, OSError) as exc:
        logger.error("Could not enqueue %s for ticket %s: %s", task.name, ticket_id, exc)
        ticket = _get(ticket_id)
        if ticket:
            on_fail(ticket)


def enqueue_ticket_pipeline(ticket_id: int) -> None:
    _safe_delay(classify_ticket_task, ticket_id, lambda t: services.mark_ai_failed(t, "AI queue unavailable"))


def enqueue_classification(ticket_id: int) -> None:
    _safe_delay(
        classify_ticket_task, ticket_id, lambda t: services.mark_ai_failed(t, "AI queue unavailable"), then_draft=False
    )


def enqueue_draft(ticket_id: int, force: bool = False) -> None:
    _safe_delay(
        generate_draft_task,
        ticket_id,
        lambda t: services.set_draft_status(t, AIStatus.FAILED, "AI queue unavailable"),
        force=force,
    )
