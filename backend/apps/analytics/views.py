from datetime import timedelta

from django.db.models import Avg, Count, F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.models import AIRequestLog
from apps.tickets.models import (
    AIStatus,
    ClassificationSource,
    MessageKind,
    Ticket,
    TicketCategory,
    TicketMessage,
    TicketPriority,
    TicketStatus,
)
from common.permissions import IsAdmin

ALLOWED_RANGES = (7, 30, 90)


def _minutes(delta) -> float | None:
    return round(delta.total_seconds() / 60, 1) if delta else None


@extend_schema(
    tags=["Admin"],
    summary="Support analytics: volume, response times, SLA, AI accuracy and cost",
    parameters=[OpenApiParameter("days", int, description="7, 30 or 90 (default 30)")],
)
class AnalyticsSummaryView(APIView):
    permission_classes = (IsAdmin,)

    def get(self, request):
        try:
            days = int(request.query_params.get("days", 30))
        except ValueError:
            days = 30
        days = days if days in ALLOWED_RANGES else 30
        now = timezone.now()
        since = now - timedelta(days=days)
        tickets = Ticket.objects.filter(created_at__gte=since)

        durations = tickets.aggregate(
            first_response=Avg(F("first_response_at") - F("created_at"), filter=Q(first_response_at__isnull=False)),
            resolution=Avg(F("resolved_at") - F("created_at"), filter=Q(resolved_at__isnull=False)),
        )
        sla = tickets.aggregate(
            met=Count("id", filter=Q(first_response_at__isnull=False, first_response_at__lte=F("sla_due_at"))),
            breached=Count("id", filter=Q(first_response_at__isnull=False, first_response_at__gt=F("sla_due_at"))),
            overdue=Count(
                "id",
                filter=Q(first_response_at__isnull=True, sla_due_at__lt=now, status__in=Ticket.ACTIVE_STATUSES),
            ),
        )
        sla_total = sla["met"] + sla["breached"] + sla["overdue"]

        classified = tickets.filter(ai_status=AIStatus.COMPLETED).exclude(ai_category="")
        overrides = classified.aggregate(
            total=Count("id"),
            category=Count("id", filter=Q(category_source=ClassificationSource.ADMIN) & ~Q(category=F("ai_category"))),
            priority=Count("id", filter=Q(priority_source=ClassificationSource.ADMIN) & ~Q(priority=F("ai_priority"))),
        )

        ai_logs = AIRequestLog.objects.filter(created_at__gte=since)
        ai = ai_logs.aggregate(
            calls=Count("id"),
            failures=Count("id", filter=Q(success=False)),
            prompt_tokens=Sum("prompt_tokens"),
            completion_tokens=Sum("completion_tokens"),
            cost_usd=Sum("cost_usd"),
            avg_latency_ms=Avg("latency_ms", filter=Q(success=True)),
        )
        by_feature = list(
            ai_logs.values("feature").annotate(calls=Count("id"), cost_usd=Sum("cost_usd"), tokens=Sum("prompt_tokens") + Sum("completion_tokens"))
        )

        replies = TicketMessage.objects.filter(created_at__gte=since, kind=MessageKind.REPLY, sender__role="ADMIN")
        drafts = replies.aggregate(
            total=Count("id"),
            ai_as_is=Count("id", filter=Q(ai_draft__isnull=False, ai_draft_edited=False)),
            ai_edited=Count("id", filter=Q(ai_draft__isnull=False, ai_draft_edited=True)),
        )

        created_series = dict(
            tickets.annotate(day=TruncDate("created_at")).values("day").annotate(c=Count("id")).values_list("day", "c")
        )
        resolved_series = dict(
            Ticket.objects.filter(resolved_at__gte=since)
            .annotate(day=TruncDate("resolved_at"))
            .values("day")
            .annotate(c=Count("id"))
            .values_list("day", "c")
        )
        series = []
        for offset in range(days, -1, -1):
            day = (now - timedelta(days=offset)).date()
            series.append({"date": day, "created": created_series.get(day, 0), "resolved": resolved_series.get(day, 0)})

        def breakdown(field, choices):
            counts = dict(tickets.values_list(field).annotate(c=Count("id")))
            return [{"key": value, "label": label, "count": counts.get(value, 0)} for value, label in choices]

        return Response(
            {
                "range_days": days,
                "totals": {
                    "created": tickets.count(),
                    "resolved": tickets.filter(status__in=[TicketStatus.RESOLVED, TicketStatus.CLOSED]).count(),
                    "open_now": Ticket.objects.filter(status__in=Ticket.ACTIVE_STATUSES).count(),
                },
                "avg_first_response_minutes": _minutes(durations["first_response"]),
                "avg_resolution_minutes": _minutes(durations["resolution"]),
                "sla": {**sla, "breach_rate": round((sla["breached"] + sla["overdue"]) / sla_total, 3) if sla_total else None},
                "by_category": breakdown("category", TicketCategory.choices),
                "by_priority": breakdown("priority", TicketPriority.choices),
                "by_status": breakdown("status", TicketStatus.choices),
                "volume": series,
                "ai_overrides": {
                    "classified": overrides["total"],
                    "category_overridden": overrides["category"],
                    "priority_overridden": overrides["priority"],
                    "category_override_rate": round(overrides["category"] / overrides["total"], 3) if overrides["total"] else None,
                    "priority_override_rate": round(overrides["priority"] / overrides["total"], 3) if overrides["total"] else None,
                },
                "ai_usage": {
                    "calls": ai["calls"],
                    "failures": ai["failures"],
                    "prompt_tokens": ai["prompt_tokens"] or 0,
                    "completion_tokens": ai["completion_tokens"] or 0,
                    "cost_usd": float(ai["cost_usd"] or 0),
                    "avg_latency_ms": round(ai["avg_latency_ms"]) if ai["avg_latency_ms"] else None,
                    "by_feature": [
                        {"feature": row["feature"], "calls": row["calls"], "cost_usd": float(row["cost_usd"] or 0), "tokens": row["tokens"] or 0}
                        for row in by_feature
                    ],
                },
                "drafts": drafts,
            }
        )
