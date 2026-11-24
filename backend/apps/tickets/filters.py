import re

import django_filters
from django.db.models import Q
from django.utils import timezone

from .models import SLA_AT_RISK_FRACTION, Ticket, TicketPriority


class CharInFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    pass


class TicketFilter(django_filters.FilterSet):
    status = CharInFilter(field_name="status", help_text="Comma-separated, e.g. OPEN,IN_PROGRESS")
    category = CharInFilter(field_name="category__key", help_text="Category keys, comma-separated")
    priority = CharInFilter(field_name="priority")
    sentiment = CharInFilter(field_name="sentiment")
    assigned = django_filters.CharFilter(method="filter_assigned", help_text="me | unassigned | <user id>")
    created_after = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="lte")
    sla = django_filters.CharFilter(method="filter_sla", help_text="overdue | at_risk")
    record = django_filters.NumberFilter(field_name="record_id")
    q = django_filters.CharFilter(method="filter_search", help_text="Search subject, description, requester, TKT-0001")

    class Meta:
        model = Ticket
        fields = ()

    def filter_assigned(self, qs, _name, value):
        if value == "me":
            return qs.filter(assigned_to=self.request.user)
        if value == "unassigned":
            return qs.filter(assigned_to__isnull=True)
        if value.isdigit():
            return qs.filter(assigned_to_id=int(value))
        return qs

    def filter_sla(self, qs, _name, value):
        now = timezone.now()
        pending = qs.filter(first_response_at__isnull=True, status__in=Ticket.ACTIVE_STATUSES)
        if value == "overdue":
            return pending.filter(sla_due_at__lt=now)
        if value == "at_risk":
            at_risk = Q()
            for priority in TicketPriority.values:
                window = self.request.workspace.sla_for(priority) * SLA_AT_RISK_FRACTION
                at_risk |= Q(priority=priority, sla_due_at__gte=now, sla_due_at__lte=now + window)
            return pending.filter(at_risk)
        return qs

    def filter_search(self, qs, _name, value):
        value = value.strip()
        match = re.fullmatch(r"(?i)tkt-?0*(\d+)", value)
        if match:
            return qs.filter(number=int(match.group(1)))
        return qs.filter(
            Q(subject__icontains=value)
            | Q(description__icontains=value)
            | Q(requester__full_name__icontains=value)
            | Q(requester__email__icontains=value)
            | Q(record__title__icontains=value)
        )
