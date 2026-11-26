from datetime import timedelta

from django.db.models import Avg, Count, F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.models import AIRequestLog
from apps.tickets.models import (
    AIStatus,
    ClassificationSource,
    MessageKind,
    Sentiment,
    Ticket,
    TicketMessage,
    TicketPriority,
    TicketStatus,
)
from common.permissions import IsStaff
from common.workspace import WorkspaceViewMixin

ALLOWED_RANGES = (7, 30, 90)


def _minutes(delta) -> float | None:
    return round(delta.total_seconds() / 60, 1) if delta else None


@extend_schema(
    tags=["Analytics"],
    summary="Support analytics: volume, response times, SLA, AI accuracy, cost, satisfaction",
    parameters=[OpenApiParameter("days", int, description="7, 30 or 90 (default 30)")],
    responses={200: OpenApiTypes.OBJECT},
)
class AnalyticsSummaryView(WorkspaceViewMixin, APIView):
    permission_classes = (IsAuthenticated, IsStaff)

    def get(self, request, slug=None):
        try:
            days = int(request.query_params.get("days", 30))
        except ValueError:
            days = 30
        days = days if days in ALLOWED_RANGES else 30
        ws = request.workspace
        now = timezone.now()
        since = now - timedelta(days=days)
        all_tickets = Ticket.objects.filter(workspace=ws)
        tickets = all_tickets.filter(created_at__gte=since)

        durations = tickets.aggregate(
            first_response=Avg(F("first_response_at") - F("created_at"), filter=Q(first_response_at__isnull=False)),
            resolution=Avg(F("resolved_at") - F("created_at"), filter=Q(resolved_at__isnull=False)),
        )
        sla = tickets.aggregate(
            met=Count("id", filter=Q(first_response_at__isnull=False, first_response_at__lte=F("sla_due_at"))),
            breached=Count("id", filter=Q(first_response_at__isnull=False, first_response_at__gt=F("sla_due_at"))),
            overdue=Count("id", filter=Q(first_response_at__isnull=True, sla_due_at__lt=now, status__in=Ticket.ACTIVE_STATUSES)),
        )
        sla_total = sla["met"] + sla["breached"] + sla["overdue"]

        classified = tickets.filter(ai_status=AIStatus.COMPLETED, ai_category__isnull=False)
        overrides = classified.aggregate(
            total=Count("id"),
            category=Count("id", filter=Q(category_source=ClassificationSource.STAFF) & ~Q(category=F("ai_category"))),
            priority=Count("id", filter=Q(priority_source=ClassificationSource.STAFF) & ~Q(priority=F("ai_priority"))),
        )

        ai_logs = AIRequestLog.objects.filter(workspace=ws, created_at__gte=since)
        ai = ai_logs.aggregate(
            calls=Count("id"),
            failures=Count("id", filter=Q(success=False)),
            prompt_tokens=Sum("prompt_tokens"),
            completion_tokens=Sum("completion_tokens"),
            cost_usd=Sum("cost_usd"),
            avg_latency_ms=Avg("latency_ms", filter=Q(success=True)),
        )
        by_feature = list(
            ai_logs.values("feature").annotate(
                calls=Count("id"), cost_usd=Sum("cost_usd"), tokens=Sum("prompt_tokens") + Sum("completion_tokens")
            )
        )

        replies = TicketMessage.objects.filter(
            ticket__workspace=ws, created_at__gte=since, kind=MessageKind.REPLY
        ).exclude(sender_id=F("ticket__requester_id"))
        drafts = replies.aggregate(
            total=Count("id"),
            ai_as_is=Count("id", filter=Q(ai_draft__isnull=False, ai_draft_edited=False)),
            ai_edited=Count("id", filter=Q(ai_draft__isnull=False, ai_draft_edited=True)),
        )

        created_series = dict(
            tickets.annotate(day=TruncDate("created_at")).values("day").annotate(c=Count("id")).values_list("day", "c")
        )
        resolved_series = dict(
            all_tickets.filter(resolved_at__gte=since)
            .annotate(day=TruncDate("resolved_at"))
            .values("day")
            .annotate(c=Count("id"))
            .values_list("day", "c")
        )
        series = []
        for offset in range(days, -1, -1):
            day = (now - timedelta(days=offset)).date()
            series.append({"date": day, "created": created_series.get(day, 0), "resolved": resolved_series.get(day, 0)})

        cat_counts = dict(tickets.values_list("category_id").annotate(c=Count("id")))
        by_category = [
            {"key": c.key, "label": c.name, "count": cat_counts.get(c.id, 0)} for c in ws.categories.all()
        ]

        def breakdown(field, choices):
            counts = dict(tickets.values_list(field).annotate(c=Count("id")))
            return [{"key": value, "label": label, "count": counts.get(value, 0)} for value, label in choices]

        csat = tickets.filter(csat_score__isnull=False).aggregate(avg=Avg("csat_score"), n=Count("id"))

        # The period of the same length just before this one, so the UI can show "vs previous" deltas.
        prev_start = since - timedelta(days=days)
        prev = all_tickets.filter(created_at__gte=prev_start, created_at__lt=since)
        prev_stats = prev.aggregate(
            first_response=Avg(F("first_response_at") - F("created_at"), filter=Q(first_response_at__isnull=False)),
            csat=Avg("csat_score"),
        )

        return Response(
            {
                "range_days": days,
                "totals": {
                    "created": tickets.count(),
                    "resolved": tickets.filter(status__in=[TicketStatus.RESOLVED, TicketStatus.CLOSED]).count(),
                    "open_now": all_tickets.filter(status__in=Ticket.ACTIVE_STATUSES).count(),
                },
                "previous": {
                    "created": prev.count(),
                    "resolved": all_tickets.filter(resolved_at__gte=prev_start, resolved_at__lt=since).count(),
                    "avg_first_response_minutes": _minutes(prev_stats["first_response"]),
                    "csat_average": round(prev_stats["csat"], 2) if prev_stats["csat"] else None,
                },
                "avg_first_response_minutes": _minutes(durations["first_response"]),
                "avg_resolution_minutes": _minutes(durations["resolution"]),
                "sla": {**sla, "breach_rate": round((sla["breached"] + sla["overdue"]) / sla_total, 3) if sla_total else None},
                "by_category": by_category,
                "by_priority": breakdown("priority", TicketPriority.choices),
                "by_status": breakdown("status", TicketStatus.choices),
                "by_sentiment": breakdown("sentiment", Sentiment.choices),
                "volume": series,
                "csat": {"average": round(csat["avg"], 2) if csat["avg"] else None, "responses": csat["n"]},
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
                        {"feature": r["feature"], "calls": r["calls"], "cost_usd": float(r["cost_usd"] or 0), "tokens": r["tokens"] or 0}
                        for r in by_feature
                    ],
                },
                "drafts": drafts,
            }
        )
