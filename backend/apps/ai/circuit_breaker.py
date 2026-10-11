"""Minimal cache-backed circuit breaker so an LLM outage doesn't stall the worker queue.

After N consecutive failures the circuit opens for a cooldown period and calls
fail fast; the first success closes it again.
"""

import time

from django.conf import settings
from django.core.cache import cache

FAILURES_KEY = "ai:circuit:failures"
OPEN_UNTIL_KEY = "ai:circuit:open_until"


def is_open() -> bool:
    open_until = cache.get(OPEN_UNTIL_KEY)
    return bool(open_until and open_until > time.time())


def record_success() -> None:
    cache.delete_many([FAILURES_KEY, OPEN_UNTIL_KEY])


def record_failure() -> None:
    try:
        failures = cache.incr(FAILURES_KEY)
    except ValueError:
        cache.set(FAILURES_KEY, 1, timeout=settings.AI_CIRCUIT_COOLDOWN_SECONDS * 2)
        failures = 1
    if failures >= settings.AI_CIRCUIT_FAILURE_THRESHOLD:
        cooldown = settings.AI_CIRCUIT_COOLDOWN_SECONDS
        cache.set(OPEN_UNTIL_KEY, time.time() + cooldown, timeout=cooldown)
        cache.delete(FAILURES_KEY)
