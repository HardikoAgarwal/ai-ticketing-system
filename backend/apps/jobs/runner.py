"""Tiny durable job runner for single-instance free-tier hosting.

* `enqueue()` writes a Job row, then (after the transaction commits) hands it to an in-process
  thread pool. The row is the source of truth, so a crash or restart loses nothing: `sweep()`
  re-dispatches anything left pending or stuck. No broker, no polling worker, so the database
  can scale to zero when idle.
* Handlers raise `Retry(delay)` for transient failures; the runner reschedules with that delay
  until JOBS_MAX_ATTEMPTS, then calls the handler's `on_exhausted` hook.
"""

import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

from django.conf import settings
from django.db import close_old_connections, transaction
from django.db.models import F
from django.utils import timezone

from .models import Job, JobStatus

logger = logging.getLogger(__name__)

STUCK_AFTER = timedelta(minutes=5)

_REGISTRY: dict[str, "_Handler"] = {}
_executor: ThreadPoolExecutor | None = None
_executor_lock = threading.Lock()


class Retry(Exception):
    """Raise from a handler to try again after `delay` seconds."""

    def __init__(self, reason: str = "", delay: float = 5):
        super().__init__(reason)
        self.delay = delay


class _Handler:
    def __init__(self, fn, on_exhausted):
        self.fn = fn
        self.on_exhausted = on_exhausted


def task(name: str, on_exhausted=None):
    def decorator(fn):
        _REGISTRY[name] = _Handler(fn, on_exhausted)
        return fn

    return decorator


def _pool() -> ThreadPoolExecutor:
    global _executor
    with _executor_lock:
        if _executor is None:
            _executor = ThreadPoolExecutor(max_workers=settings.JOBS_MAX_WORKERS, thread_name_prefix="job")
        return _executor


def enqueue(name: str, **payload) -> Job:
    """Persist a job and dispatch it once the surrounding transaction commits."""
    job = Job.objects.create(name=name, payload=payload)
    transaction.on_commit(lambda: _dispatch(job.pk))
    return job


def _dispatch(job_id: int, delay: float = 0) -> None:
    if settings.JOBS_EAGER:
        run_job(job_id)
    elif delay > 0:
        timer = threading.Timer(delay, lambda: _pool().submit(run_job, job_id))
        timer.daemon = True
        timer.start()
    else:
        _pool().submit(run_job, job_id)


def run_job(job_id: int) -> None:
    # Threads own their connections; in eager mode we share the caller's (and its transaction).
    if not settings.JOBS_EAGER:
        close_old_connections()
    try:
        claimed = Job.objects.filter(pk=job_id, status=JobStatus.PENDING, run_at__lte=timezone.now()).update(
            status=JobStatus.RUNNING, locked_at=timezone.now(), attempts=F("attempts") + 1
        )
        if not claimed:
            return
        job = Job.objects.get(pk=job_id)
        handler = _REGISTRY.get(job.name)
        if handler is None:
            _finish(job, JobStatus.FAILED, f"No handler for {job.name}")
            return
        try:
            handler.fn(**job.payload)
        except Retry as exc:
            if job.attempts >= settings.JOBS_MAX_ATTEMPTS:
                _exhausted(job, handler, str(exc))
            else:
                job.status = JobStatus.PENDING
                job.run_at = timezone.now() + timedelta(seconds=exc.delay)
                job.last_error = str(exc)[:255]
                job.locked_at = None
                job.save(update_fields=["status", "run_at", "last_error", "locked_at"])
                if not settings.JOBS_EAGER:
                    _dispatch(job.pk, delay=exc.delay)
        except Exception as exc:  # noqa: BLE001 - a job must never take the worker thread down
            logger.exception("Job %s (%s) failed", job.pk, job.name)
            _exhausted(job, handler, f"{type(exc).__name__}: {exc}")
        else:
            _finish(job, JobStatus.DONE, "")
    finally:
        if not settings.JOBS_EAGER:
            close_old_connections()


def _exhausted(job: Job, handler: _Handler, error: str) -> None:
    _finish(job, JobStatus.FAILED, error)
    if handler.on_exhausted:
        try:
            handler.on_exhausted(error, **job.payload)
        except Exception:  # noqa: BLE001
            logger.exception("on_exhausted hook for %s failed", job.name)


def _finish(job: Job, status: str, error: str) -> None:
    Job.objects.filter(pk=job.pk).update(status=status, last_error=error[:255], locked_at=None)


def sweep() -> int:
    """Re-dispatch due or stuck jobs. Cheap; called from the health endpoint and at startup."""
    now = timezone.now()
    Job.objects.filter(status=JobStatus.RUNNING, locked_at__lt=now - STUCK_AFTER).update(
        status=JobStatus.PENDING, locked_at=None
    )
    due = list(Job.objects.filter(status=JobStatus.PENDING, run_at__lte=now).values_list("pk", flat=True)[:50])
    for pk in due:
        _dispatch(pk)
    return len(due)


def purge_old(days: int = 3) -> int:
    deleted, _ = Job.objects.filter(
        status__in=[JobStatus.DONE, JobStatus.FAILED], created_at__lt=timezone.now() - timedelta(days=days)
    ).delete()
    return deleted
