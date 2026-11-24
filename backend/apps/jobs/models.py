from django.db import models
from django.utils import timezone


class JobStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    RUNNING = "RUNNING", "Running"
    DONE = "DONE", "Done"
    FAILED = "FAILED", "Failed"


class Job(models.Model):
    """Durable background job. Runs on an in-process thread pool; a sweeper re-runs anything left behind."""

    name = models.CharField(max_length=60)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=10, choices=JobStatus.choices, default=JobStatus.PENDING, db_index=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    run_at = models.DateTimeField(default=timezone.now, db_index=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("run_at", "id")
