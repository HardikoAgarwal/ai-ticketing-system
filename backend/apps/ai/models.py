from django.db import models
from django.utils import timezone


class AIDraft(models.Model):
    ticket = models.ForeignKey("tickets.Ticket", on_delete=models.CASCADE, related_name="ai_drafts")
    content = models.TextField()
    model = models.CharField(max_length=60)
    prompt_version = models.CharField(max_length=30)
    kb_sections = models.JSONField(default=list, blank=True)
    input_hash = models.CharField(max_length=64, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("-created_at",)


class AIFeature(models.TextChoices):
    CLASSIFY = "CLASSIFY", "Classification"
    DRAFT = "DRAFT", "Draft response"


class AIRequestLog(models.Model):
    """One row per LLM call: the evidence trail for cost and reliability."""

    ticket = models.ForeignKey("tickets.Ticket", on_delete=models.SET_NULL, null=True, blank=True)
    feature = models.CharField(max_length=10, choices=AIFeature.choices)
    model = models.CharField(max_length=60)
    prompt_version = models.CharField(max_length=30)
    prompt_tokens = models.PositiveIntegerField(default=0)
    cached_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    latency_ms = models.PositiveIntegerField(default=0)
    success = models.BooleanField(default=True)
    error_type = models.CharField(max_length=60, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ("-created_at",)
