"""Thin wrapper around the OpenAI SDK: timeouts, error taxonomy, circuit breaker, usage logging."""

import logging
import time
from dataclasses import dataclass
from decimal import Decimal
from functools import lru_cache

import openai
from django.conf import settings

from . import circuit_breaker
from .models import AIRequestLog

logger = logging.getLogger(__name__)


class AIError(Exception):
    """Base class for AI failures."""


class AIUnavailableError(AIError):
    """Transient failure (timeout, rate limit, 5xx, circuit open). Safe to retry."""


class AIPermanentError(AIError):
    """Non-retryable failure (bad request, auth, invalid output, AI disabled)."""


RETRYABLE_EXCEPTIONS = (
    openai.APITimeoutError,
    openai.APIConnectionError,
    openai.RateLimitError,
    openai.InternalServerError,
)


@dataclass
class LLMResult:
    content: str
    prompt_tokens: int
    completion_tokens: int


@lru_cache(maxsize=1)
def _client() -> openai.OpenAI:
    # SDK-level retries are disabled; Celery owns retry/backoff so failures stay visible and logged.
    return openai.OpenAI(api_key=settings.OPENAI_API_KEY, timeout=settings.AI_TIMEOUT_SECONDS, max_retries=0)


def _estimate_cost(prompt_tokens: int, completion_tokens: int) -> Decimal:
    cost = (
        prompt_tokens * settings.AI_PRICE_INPUT_PER_M + completion_tokens * settings.AI_PRICE_OUTPUT_PER_M
    ) / 1_000_000
    return Decimal(str(round(cost, 6)))


def chat(
    *,
    feature: str,
    messages: list[dict],
    prompt_version: str,
    ticket_id: int | None = None,
    max_tokens: int,
    temperature: float = 0.2,
    response_format: dict | None = None,
) -> LLMResult:
    if not settings.AI_ENABLED:
        raise AIPermanentError("AI is disabled (no OPENAI_API_KEY configured)")
    if circuit_breaker.is_open():
        raise AIUnavailableError("AI temporarily paused after repeated failures (circuit open)")

    log = AIRequestLog(ticket_id=ticket_id, feature=feature, model=settings.AI_MODEL, prompt_version=prompt_version)
    started = time.monotonic()
    kwargs = {
        "model": settings.AI_MODEL,
        "messages": messages,
        "max_completion_tokens": max_tokens,
        "temperature": temperature,
    }
    if response_format:
        kwargs["response_format"] = response_format

    try:
        response = _client().chat.completions.create(**kwargs)
    except RETRYABLE_EXCEPTIONS as exc:
        circuit_breaker.record_failure()
        _save_failure(log, started, exc)
        raise AIUnavailableError(f"{type(exc).__name__}: {exc}") from exc
    except openai.OpenAIError as exc:
        _save_failure(log, started, exc)
        raise AIPermanentError(f"{type(exc).__name__}: {exc}") from exc

    circuit_breaker.record_success()
    usage = response.usage
    prompt_tokens = getattr(usage, "prompt_tokens", 0) or 0
    completion_tokens = getattr(usage, "completion_tokens", 0) or 0
    details = getattr(usage, "prompt_tokens_details", None)
    log.prompt_tokens = prompt_tokens
    log.completion_tokens = completion_tokens
    log.cached_tokens = (getattr(details, "cached_tokens", 0) or 0) if details else 0
    log.cost_usd = _estimate_cost(prompt_tokens, completion_tokens)
    log.latency_ms = int((time.monotonic() - started) * 1000)
    log.save()

    content = (response.choices[0].message.content or "").strip()
    if not content:
        raise AIPermanentError("Empty response from model")
    return LLMResult(content=content, prompt_tokens=prompt_tokens, completion_tokens=completion_tokens)


def _save_failure(log: AIRequestLog, started: float, exc: Exception) -> None:
    logger.warning("LLM call failed (%s): %s", log.feature, exc)
    log.success = False
    log.error_type = type(exc).__name__[:60]
    log.latency_ms = int((time.monotonic() - started) * 1000)
    log.save()
