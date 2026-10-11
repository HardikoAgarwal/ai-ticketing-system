from django.contrib import admin

from .models import AIDraft, AIRequestLog


@admin.register(AIRequestLog)
class AIRequestLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "feature", "model", "prompt_tokens", "completion_tokens", "cost_usd", "latency_ms", "success")
    list_filter = ("feature", "success", "model")


@admin.register(AIDraft)
class AIDraftAdmin(admin.ModelAdmin):
    list_display = ("ticket", "model", "prompt_version", "created_at")
