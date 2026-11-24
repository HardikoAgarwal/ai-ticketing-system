from django.conf import settings
from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view, inline_serializer
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.ai import budget
from apps.ai.drafter import current_draft
from apps.ai.models import AIDraft
from apps.workspaces.models import Membership
from common.exceptions import DomainError
from common.permissions import IsRequester, IsStaff
from common.workspace import WorkspaceViewMixin

from . import notifications, services
from .filters import TicketFilter
from .models import AIStatus, MessageKind, Ticket, TicketActivity, TicketMessage, TicketPriority
from .selectors import requester_replied_exists, tickets_visible_to
from .serializers import (
    ConfirmResolutionSerializer,
    CSATSerializer,
    DraftSerializer,
    MessageCreateSerializer,
    MessageSerializer,
    NotificationFeedSerializer,
    RequesterTicketDetailSerializer,
    RequesterTicketSerializer,
    StaffMessageSerializer,
    StaffTicketDetailSerializer,
    StaffTicketSerializer,
    StaffTicketUpdateSerializer,
    TicketCreateSerializer,
)

STAFF_ONLY_ACTIONS = (
    "partial_update", "assign_to_me", "draft", "regenerate_draft", "reclassify", "stats", "similar", "ai_usage",
)


@extend_schema_view(
    list=extend_schema(summary="List tickets (requesters: own tickets; staff: all, with filters)"),
    retrieve=extend_schema(summary="Ticket detail with conversation (internal notes only for staff)"),
    create=extend_schema(summary="Requester raises a ticket (multipart; optional attachments)"),
    partial_update=extend_schema(summary="Staff update status, category, priority or assignee"),
)
@extend_schema(tags=["Tickets"])
class TicketViewSet(
    WorkspaceViewMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    filterset_class = TicketFilter
    ordering_fields = ("created_at", "updated_at", "priority_rank", "sla_due_at")
    ordering = ("priority_rank", "created_at")
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    http_method_names = ("get", "post", "patch")

    @property
    def is_staff_user(self) -> bool:
        m = getattr(self.request, "membership", None)
        return bool(m and m.is_staff_member)

    def _detail_qs(self):
        return tickets_visible_to(self.request).prefetch_related(
            Prefetch("messages", queryset=TicketMessage.objects.select_related("sender", "ticket")),
            "attachments",
            Prefetch("activities", queryset=TicketActivity.objects.select_related("actor")),
        )

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Ticket.objects.none()
        qs = tickets_visible_to(self.request)
        if self.action == "retrieve":
            return self._detail_qs()
        if self.action == "list" and self.is_staff_user:
            qs = qs.annotate(requester_replied=requester_replied_exists())
        elif self.action == "list":
            qs = qs.order_by("-updated_at")
        return qs

    def get_serializer_class(self):
        staff = self.is_staff_user
        if self.action == "retrieve":
            return StaffTicketDetailSerializer if staff else RequesterTicketDetailSerializer
        if self.action == "create":
            return TicketCreateSerializer
        if self.action == "partial_update":
            return StaffTicketUpdateSerializer
        return StaffTicketSerializer if staff else RequesterTicketSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        if getattr(self.request, "workspace", None):
            ctx["team_name"] = self.request.workspace.agent_title
        return ctx

    def get_permissions(self):
        if self.action == "create":
            return [*super().get_permissions(), IsRequester()]
        if self.action in STAFF_ONLY_ACTIONS:
            return [*super().get_permissions(), IsStaff()]
        if self.action in ("confirm_resolution", "csat"):
            return [*super().get_permissions(), IsRequester()]
        return super().get_permissions()

    def get_throttles(self):
        scope = {"create": "ticket_create", "regenerate_draft": "ai_regenerate", "reclassify": "ai_regenerate"}.get(self.action)
        if scope:
            self.throttle_scope = scope
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def _detail(self, ticket, status_code=status.HTTP_200_OK):
        ticket = self._detail_qs().get(pk=ticket.pk)
        cls = StaffTicketDetailSerializer if self.is_staff_user else RequesterTicketDetailSerializer
        return Response(cls(ticket, context=self.get_serializer_context()).data, status=status_code)

    # --- CRUD --------------------------------------------------------------

    @extend_schema(request={"multipart/form-data": TicketCreateSerializer}, responses=RequesterTicketDetailSerializer)
    def create(self, request, *args, **kwargs):
        serializer = TicketCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        ticket = services.create_ticket(
            workspace=request.workspace,
            requester=request.user,
            subject=data["subject"],
            description=data["description"],
            record=data.get("record"),
            files=data.get("attachments", []),
        )
        return self._detail(ticket, status.HTTP_201_CREATED)

    @extend_schema(request=StaffTicketUpdateSerializer, responses=StaffTicketDetailSerializer)
    def partial_update(self, request, *args, **kwargs):
        ticket = self.get_object()
        serializer = StaffTicketUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        category = data.get("category")
        if category and category.workspace_id != request.workspace.id:
            raise DomainError("Unknown category.", code="invalid_category", status_code=400)
        assignee = ...
        if "assigned_to" in data:
            assignee = None
            if data["assigned_to"] is not None:
                member = Membership.objects.filter(
                    workspace=request.workspace, user_id=data["assigned_to"], role__in=["OWNER", "ADMIN", "AGENT"]
                ).select_related("user").first()
                if member is None:
                    raise DomainError("Tickets can only be assigned to team members.", code="invalid_assignee", status_code=400)
                assignee = member.user
        services.update_ticket(
            ticket, request.user, status=data.get("status"), category=category, priority=data.get("priority"), assigned_to=assignee
        )
        return self._detail(ticket)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    # --- Actions -------------------------------------------------------------

    @extend_schema(summary="Assign the ticket to the current user", request=None, responses=StaffTicketDetailSerializer)
    @action(detail=True, methods=["post"], url_path="assign-to-me")
    def assign_to_me(self, request, slug=None, pk=None):
        services.update_ticket(self.get_object(), request.user, assigned_to=request.user)
        return self._detail(self.get_object())

    @extend_schema(methods=["GET"], summary="List messages (requesters never receive internal notes)", responses=MessageSerializer(many=True))
    @extend_schema(
        methods=["POST"],
        summary="Post a reply. Staff may post kind=NOTE (internal) and resolve=true; requesters post follow-ups.",
        request=MessageCreateSerializer,
        responses=MessageSerializer,
    )
    @action(detail=True, methods=["get", "post"])
    def messages(self, request, slug=None, pk=None):
        ticket = self.get_object()
        ctx = self.get_serializer_context()
        if request.method == "GET":
            qs = ticket.messages.select_related("sender", "ticket")
            if not self.is_staff_user:
                return Response(MessageSerializer(qs.filter(kind=MessageKind.REPLY), many=True, context=ctx).data)
            return Response(StaffMessageSerializer(qs, many=True, context=ctx).data)

        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if self.is_staff_user:
            draft = None
            if data.get("ai_draft_id"):
                draft = AIDraft.objects.filter(pk=data["ai_draft_id"], ticket=ticket).first()
            message = services.post_staff_message(
                ticket, request.user, body=data["body"], kind=data["kind"], ai_draft=draft, resolve=data["resolve"]
            )
            return Response(StaffMessageSerializer(message, context=ctx).data, status=status.HTTP_201_CREATED)

        if data["kind"] != MessageKind.REPLY or data["resolve"]:
            raise DomainError("Requesters can only post replies.", code="forbidden", status_code=403)
        message = services.post_requester_message(ticket, request.user, body=data["body"])
        return Response(MessageSerializer(message, context=ctx).data, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Notification feed for the bell", responses=NotificationFeedSerializer)
    @action(detail=False, methods=["get"])
    def notifications(self, request, slug=None):
        return Response(notifications.notification_feed(request))

    @extend_schema(summary="Mark every notification as read", request=None, responses=None)
    @action(detail=False, methods=["post"], url_path="notifications/mark-all-read")
    def mark_all_notifications_read(self, request, slug=None):
        notifications.mark_all_read(request)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(summary="Mark the ticket as seen by the current user (clears unread badge)", request=None, responses=None)
    @action(detail=True, methods=["post"], url_path="mark-seen")
    def mark_seen(self, request, slug=None, pk=None):
        services.mark_seen(self.get_object(), staff=self.is_staff_user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        summary="Requester closes their ticket (resolved=true) or, on a resolved ticket, reopens it (resolved=false)",
        request=ConfirmResolutionSerializer,
        responses=RequesterTicketDetailSerializer,
    )
    @action(detail=True, methods=["post"], url_path="confirm-resolution")
    def confirm_resolution(self, request, slug=None, pk=None):
        ticket = self.get_object()
        serializer = ConfirmResolutionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.confirm_resolution(
            ticket, request.user, resolved=serializer.validated_data["resolved"],
            message=serializer.validated_data.get("message", ""),
        )
        return self._detail(ticket)

    @extend_schema(summary="Requester rates the support they received (1-5)", request=CSATSerializer, responses=RequesterTicketDetailSerializer)
    @action(detail=True, methods=["post"])
    def csat(self, request, slug=None, pk=None):
        ticket = self.get_object()
        serializer = CSATSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.submit_csat(ticket, request.user, **serializer.validated_data)
        return self._detail(ticket)

    @extend_schema(summary="Get the AI-drafted reply for this ticket (generated in the background)", responses=DraftSerializer)
    @action(detail=True, methods=["get"])
    def draft(self, request, slug=None, pk=None):
        return Response(self._draft_payload(self.get_object()))

    @extend_schema(summary="Regenerate the AI draft (bypasses cache)", request=None, responses=DraftSerializer)
    @action(detail=True, methods=["post"], url_path="draft/regenerate")
    def regenerate_draft(self, request, slug=None, pk=None):
        ticket = services.request_draft(self.get_object(), force=True)
        return Response(self._draft_payload(ticket, generating=True), status=status.HTTP_202_ACCEPTED)

    @extend_schema(summary="Re-run AI triage (staff overrides are preserved)", request=None, responses=StaffTicketSerializer)
    @action(detail=True, methods=["post"])
    def reclassify(self, request, slug=None, pk=None):
        ticket = services.request_reclassification(self.get_object())
        return Response(StaffTicketSerializer(ticket, context=self.get_serializer_context()).data, status=status.HTTP_202_ACCEPTED)

    @extend_schema(
        summary="Possible duplicate or related tickets (embedding similarity)",
        responses=inline_serializer(
            "SimilarTicket",
            fields={
                "id": serializers.IntegerField(), "reference": serializers.CharField(), "subject": serializers.CharField(),
                "status": serializers.CharField(), "similarity": serializers.FloatField(),
            },
            many=True,
        ),
    )
    @action(detail=True, methods=["get"])
    def similar(self, request, slug=None, pk=None):
        from apps.ai.similarity import similar_tickets

        return Response(similar_tickets(self.get_object()))

    @extend_schema(
        summary="Short-lived download URL for an attachment",
        responses=inline_serializer("AttachmentUrl", fields={"url": serializers.URLField(), "name": serializers.CharField()}),
    )
    @action(detail=True, methods=["get"], url_path=r"attachments/(?P<attachment_id>\d+)")
    def attachment(self, request, slug=None, pk=None, attachment_id=None):
        ticket = self.get_object()
        attachment = get_object_or_404(ticket.attachments, pk=attachment_id)
        url = attachment.file.url
        if url.startswith("/"):
            url = request.build_absolute_uri(url)
        return Response({"url": url, "name": attachment.original_name})

    @extend_schema(
        summary="Queue KPI counts for the staff dashboard",
        responses=inline_serializer(
            "QueueStats",
            fields={k: serializers.IntegerField() for k in ("open", "in_progress", "unassigned", "overdue", "critical", "mine", "ai_failed")},
        ),
    )
    @action(detail=False, methods=["get"])
    def stats(self, request, slug=None):
        active = tickets_visible_to(request).filter(status__in=Ticket.ACTIVE_STATUSES)
        counts = active.aggregate(
            open=Count("id", filter=Q(status="OPEN")),
            in_progress=Count("id", filter=Q(status="IN_PROGRESS")),
            unassigned=Count("id", filter=Q(assigned_to__isnull=True)),
            overdue=Count("id", filter=Q(first_response_at__isnull=True, sla_due_at__lt=timezone.now())),
            critical=Count("id", filter=Q(priority=TicketPriority.CRITICAL)),
            mine=Count("id", filter=Q(assigned_to=request.user)),
            ai_failed=Count("id", filter=Q(ai_status=AIStatus.FAILED)),
        )
        return Response(counts)

    @extend_schema(
        summary="Live AI budget (free-tier daily caps)",
        responses=inline_serializer(
            "AIUsage",
            fields={k: serializers.IntegerField() for k in ("global_used", "global_cap", "workspace_used", "workspace_cap")},
        ),
    )
    @action(detail=False, methods=["get"], url_path="ai-usage")
    def ai_usage(self, request, slug=None):
        return Response(budget.usage(request.workspace.id))

    # --- Helpers ---------------------------------------------------------------

    def _draft_payload(self, ticket: Ticket, generating: bool = False) -> dict:
        if not services.ai_active(ticket.workspace):
            return {"status": "disabled", "draft": None, "error": "AI drafting is off for this workspace."}
        if not generating:
            draft = current_draft(ticket)
            if draft:
                return {
                    "status": "ready",
                    "draft": {
                        "id": draft.id,
                        "content": draft.content,
                        "citations": draft.citations,
                        "model": draft.model,
                        "created_at": draft.created_at,
                    },
                    "error": "",
                }
            if ticket.ai_draft_status == AIStatus.FAILED:
                return {"status": "failed", "draft": None, "error": ticket.ai_error or "AI draft unavailable."}
            if ticket.ai_draft_status != AIStatus.PENDING and ticket.ai_status != AIStatus.PENDING:
                services.request_draft(ticket)
        return {"status": "generating", "draft": None, "error": ""}
