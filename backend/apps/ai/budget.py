"""Free-tier protection. Gemini's free tier allows roughly 500 requests a day for the whole project,
so live chat calls are capped globally and per workspace. Over the cap, tickets fall back to the
rule-based classifier and staff write replies manually; seeded demo data already carries AI results."""

from django.conf import settings
from django.utils import timezone

from .models import AIFeature, AIRequestLog


class AIBudgetExceeded(Exception):
    def __init__(self, scope: str):
        super().__init__(f"Daily AI budget reached ({scope}).")
        self.scope = scope


def _today_start():
    return timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)


def _chat_calls(**filters):
    # Seeded demo history ("seed" rows) is decoration, not real usage: it must not eat the live budget.
    return (
        AIRequestLog.objects.filter(created_at__gte=_today_start(), **filters)
        .exclude(feature=AIFeature.EMBED)
        .exclude(prompt_version="seed")
    )


def usage(workspace_id: int | None = None) -> dict:
    used_global = _chat_calls().count()
    used_ws = _chat_calls(workspace_id=workspace_id).count() if workspace_id else 0
    return {
        "global_used": used_global,
        "global_cap": settings.AI_DAILY_CALL_CAP,
        "workspace_used": used_ws,
        "workspace_cap": settings.AI_WORKSPACE_DAILY_CAP,
    }


def check(workspace_id: int | None, feature: str) -> None:
    if feature == AIFeature.EMBED:
        return
    if _chat_calls().count() >= settings.AI_DAILY_CALL_CAP:
        raise AIBudgetExceeded("global")
    if workspace_id and _chat_calls(workspace_id=workspace_id).count() >= settings.AI_WORKSPACE_DAILY_CAP:
        raise AIBudgetExceeded("workspace")
