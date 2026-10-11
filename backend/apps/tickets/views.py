from django.conf import settings
from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view, inline_serializer
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.ai.drafter import current_draft
from apps.ai.models import AIDraft
from common.exceptions import DomainError
from common.permissions import IsAdmin, IsAuthor

from . import services
from .filters import TicketFilter
from .models import AIStatus, MessageKind, Ticket, TicketActivity, TicketMessage, TicketPriority
from .selectors import tickets_visible_to
from .serializers import (
    AdminMessageSerializer,
    AdminTicketDetailSerializer,
    AdminTicketSerializer,
    AdminTicketUpdateSerializer,
    AuthorTicketDetailSerializer,
    AuthorTicketSerializer,
    ConfirmResolutionSerializer,
    DraftSerializer,
    MessageCreateSerializer,
    MessageSerializer,
    TicketCreateSerializer,
)


@extend_schema_view(
    list=extend_schema(summary="List tickets (authors: own tickets; admins: all, with filters)"),
    retrieve=extend_schema(summary="Ticket detail with conversation (internal notes only for admins)"),
    create=extend_schema(summary="Author raises a ticket (multipart; optional attachments)"),
    partial_update=extend_schema(summary="Admin updates status, category, priority or assignee"),
)
@extend_schema(tags=["Tickets"])
class TicketViewSet(
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

    def get_queryset(self):
        qs = tickets_visible_to(self.request.user)
        if self.action == "retrieve":
            messages = TicketMessage.objects.select_related("sender")
            qs = qs.prefetch_related(
                Prefetch("messages", queryset=messages),
                "attachments",
                Prefetch("activities", queryset=TicketActivity.objects.select_related("actor")),
            )
        elif self.action == "list" and not getattr(self.request.user, "is_admin", False):
            qs = qs.order_by("-updated_at")
        return qs

    def get_serializer_class(self):
        admin = self.request.user.is_authenticated and self.request.user.is_admin
        if self.action == "retrieve":
            return AdminTicketDetailSerializer if admin else AuthorTicketDetailSerializer
        if self.action == "create":
            return TicketCreateSerializer
        if self.action == "partial_update":
            return AdminTicketUpdateSerializer
        return AdminTicketSerializer if admin else AuthorTicketSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthor()]
        if self.action in ("partial_update", "assign_to_me", "draft", "regenerate_draft", "reclassify", "stats"):
            return [IsAdmin()]
        if self.action == "confirm_resolution":
            return [IsAuthor()]
        return super().get_permissions()

    def get_throttles(self):
        scope = {"create": "ticket_create", "regenerate_draft": "ai_regenerate", "reclassify": "ai_regenerate"}.get(
            self.action
        )
        if scope:
            self.throttle_scope = scope
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def _detail(self, ticket, status_code=status.HTTP_200_OK):
        ticket = self.get_queryset_for_detail().get(pk=ticket.pk)
        serializer_cls = AdminTicketDetailSerializer if self.request.user.is_admin else AuthorTicketDetailSerializer
        return Response(serializer_cls(ticket, context=self.get_serializer_context()).data, status=status_code)

    def get_queryset_for_detail(self):
        return tickets_visible_to(self.request.user).prefetch_related(
            Prefetch("messages", queryset=TicketMessage.objects.select_related("sender")),
            "attachments",
            Prefetch("activities", queryset=TicketActivity.objects.select_related("actor")),
        )

    # --- CRUD --------------------------------------------------------------

    @extend_schema(request={"multipart/form-data": TicketCreateSerializer}, responses=AuthorTicketDetailSerializer)
    def create(self, request, *args, **kwargs):
        serializer = TicketCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        ticket = services.create_ticket(
            author_user=request.user,
            subject=data["subject"],
            description=data["description"],
            book=data.get("book"),
            files=data.get("attachments", []),
        )
        return self._detail(ticket, status.HTTP_201_CREATED)

    @extend_schema(request=AdminTicketUpdateSerializer, responses=AdminTicketDetailSerializer)
    def partial_update(self, request, *args, **kwargs):
        ticket = self.get_object()
        serializer = AdminTicketUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        services.update_ticket(
            ticket,
            request.user,
            status=data.get("status"),
            category=data.get("category"),
            priority=data.get("priority"),
            assigned_to=data["assigned_to"] if "assigned_to" in data else ...,
        )
        return self._detail(ticket)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    # --- Actions -------------------------------------------------------------

    @extend_schema(summary="Assign the ticket to the current admin", request=None, responses=AdminTicketDetailSerializer)
    @action(detail=True, methods=["post"], url_path="assign-to-me")
    def assign_to_me(self, request, pk=None):
        ticket = self.get_object()
        services.update_ticket(ticket, request.user, assigned_to=request.user)
        return self._detail(ticket)

    @extend_schema(
        methods=["GET"], summary="List messages (authors never receive internal notes)", responses=MessageSerializer(many=True)
    )
    @extend_schema(
        methods=["POST"],
        summary="Post a reply. Admins may post kind=NOTE (internal) and resolve=true; authors post follow-ups.",
        request=MessageCreateSerializer,
        responses=MessageSerializer,
    )
    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        ticket = self.get_object()
        if request.method == "GET":
            qs = ticket.messages.select_related("sender")
            if not request.user.is_admin:
                qs = qs.filter(kind=MessageKind.REPLY)
                return Response(MessageSerializer(qs, many=True).data)
            return Response(AdminMessageSerializer(qs, many=True).data)

        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if request.user.is_admin:
            draft = None
            if data.get("ai_draft_id"):
                draft = AIDraft.objects.filter(pk=data["ai_draft_id"], ticket=ticket).first()
            message = services.post_admin_message(
                ticket, request.user, body=data["body"], kind=data["kind"], ai_draft=draft, resolve=data["resolve"]
            )
            return Response(AdminMessageSerializer(message).data, status=status.HTTP_201_CREATED)

        if data["kind"] != MessageKind.REPLY or data["resolve"]:
            raise DomainError("Authors can only post replies.", code="forbidden", status_code=403)
        message = services.post_author_message(ticket, request.user, body=data["body"])
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Mark the ticket as seen by the current user (clears unread badge)", request=None, responses=None)
    @action(detail=True, methods=["post"], url_path="mark-seen")
    def mark_seen(self, request, pk=None):
        services.mark_seen(self.get_object(), request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        summary="Author marks their ticket resolved (closes it) or, on a resolved ticket, says they still need help (reopens it)",
        request=ConfirmResolutionSerializer,
        responses=AuthorTicketDetailSerializer,
    )
    @action(detail=True, methods=["post"], url_path="confirm-resolution")
    def confirm_resolution(self, request, pk=None):
        ticket = self.get_object()
        serializer = ConfirmResolutionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.confirm_resolution(
            ticket, request.user, resolved=serializer.validated_data["resolved"],
            message=serializer.validated_data.get("message", ""),
        )
        return self._detail(ticket)

    @extend_schema(summary="Get the AI-drafted reply for this ticket (generated in the background)", responses=DraftSerializer)
    @action(detail=True, methods=["get"])
    def draft(self, request, pk=None):
        ticket = self.get_object()
        return Response(self._draft_payload(ticket))

    @extend_schema(summary="Regenerate the AI draft (bypasses cache)", request=None, responses=DraftSerializer)
    @action(detail=True, methods=["post"], url_path="draft/regenerate")
    def regenerate_draft(self, request, pk=None):
        ticket = services.request_draft(self.get_object(), force=True)
        return Response(self._draft_payload(ticket, generating=True), status=status.HTTP_202_ACCEPTED)

    @extend_schema(summary="Re-run AI classification (admin overrides are preserved)", request=None, responses=AdminTicketSerializer)
    @action(detail=True, methods=["post"])
    def reclassify(self, request, pk=None):
        ticket = services.request_reclassification(self.get_object())
        return Response(AdminTicketSerializer(ticket).data, status=status.HTTP_202_ACCEPTED)

    @extend_schema(
        summary="Short-lived download URL for an attachment",
        responses=inline_serializer("AttachmentUrl", fields={"url": serializers.URLField(), "name": serializers.CharField()}),
    )
    @action(detail=True, methods=["get"], url_path=r"attachments/(?P<attachment_id>\d+)")
    def attachment(self, request, pk=None, attachment_id=None):
        ticket = self.get_object()
        attachment = get_object_or_404(ticket.attachments, pk=attachment_id)
        url = attachment.file.url
        if url.startswith("/"):
            url = request.build_absolute_uri(url)
        return Response({"url": url, "name": attachment.original_name})

    @extend_schema(
        summary="Queue KPI counts for the admin dashboard",
        responses=inline_serializer(
            "QueueStats",
            fields={k: serializers.IntegerField() for k in ("open", "in_progress", "unassigned", "overdue", "critical", "mine", "ai_failed")},
        ),
    )
    @action(detail=False, methods=["get"])
    def stats(self, request):
        active = Ticket.objects.filter(status__in=Ticket.ACTIVE_STATUSES)
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

    # --- Helpers ---------------------------------------------------------------

    def _draft_payload(self, ticket: Ticket, generating: bool = False) -> dict:
        if not settings.AI_ENABLED:
            return {"status": "disabled", "draft": None, "error": "AI drafting is not configured on this server."}
        if not generating:
            draft = current_draft(ticket)
            if draft:
                return {
                    "status": "ready",
                    "draft": {
                        "id": draft.id,
                        "content": draft.content,
                        "kb_sections": draft.kb_sections,
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
