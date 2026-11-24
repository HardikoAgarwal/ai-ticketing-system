from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.kb import retrieval
from apps.kb.indexing import reindex_article
from apps.kb.models import Article
from apps.kb.serializers import ArticleListSerializer, ArticleSerializer
from apps.tickets.models import Macro
from apps.tickets.serializers import MacroSerializer
from common.exceptions import DomainError
from common.permissions import IsManager, IsStaff
from common.workspace import WorkspaceViewMixin

from .models import Category, Invite, Membership, Record, Role, Workspace
from .serializers import (
    CategorySerializer,
    InviteSerializer,
    MemberBriefSerializer,
    MembershipSerializer,
    RecordSerializer,
    WorkspaceSerializer,
)
from .services import new_invite_token


@extend_schema(tags=["Workspace"])
class WorkspaceDetailView(WorkspaceViewMixin, GenericAPIView):
    serializer_class = WorkspaceSerializer

    def get_permissions(self):
        return [IsAuthenticated(), *( [IsManager()] if self.request.method == "PATCH" else [] )]

    @extend_schema(summary="Workspace settings and the caller's role", responses=WorkspaceSerializer)
    def get(self, request, slug=None):
        data = WorkspaceSerializer(request.workspace).data
        data["role"] = request.membership.role
        return Response(data)

    @extend_schema(summary="Update name, tone, sign-off, SLA targets, AI toggle (owners/admins)", request=WorkspaceSerializer, responses=WorkspaceSerializer)
    def patch(self, request, slug=None):
        serializer = WorkspaceSerializer(request.workspace, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        sla = serializer.validated_data.get("sla_hours")
        if sla is not None and (set(sla) != {"CRITICAL", "HIGH", "MEDIUM", "LOW"} or any(not isinstance(v, int) or v < 1 for v in sla.values())):
            raise DomainError("sla_hours needs positive integer hours for CRITICAL, HIGH, MEDIUM and LOW.", code="validation_error", status_code=400)
        serializer.save()
        data = serializer.data
        data["role"] = request.membership.role
        return Response(data)


@extend_schema(tags=["Workspace"])
class CategoryViewSet(WorkspaceViewMixin, viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    pagination_class = None
    http_method_names = ("get", "post", "patch", "delete")

    def get_queryset(self):
        return Category.objects.filter(workspace=self.request.workspace)

    def get_permissions(self):
        return [IsAuthenticated(), *([] if self.request.method == "GET" else [IsManager()])]

    def perform_create(self, serializer):
        serializer.save(workspace=self.request.workspace)

    def perform_destroy(self, instance):
        if instance.is_default:
            raise DomainError("The default category can't be deleted.", code="conflict")
        instance.delete()


@extend_schema(tags=["Workspace"])
class MemberViewSet(WorkspaceViewMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    """Team directory. Staff see everyone; `?role=staff` limits it to assignable team members."""

    pagination_class = None
    permission_classes = (IsAuthenticated, IsStaff)

    def get_serializer_class(self):
        return MembershipSerializer if self.request.membership.is_manager else MemberBriefSerializer

    def get_queryset(self):
        qs = Membership.objects.filter(workspace=self.request.workspace).select_related("user").order_by("user__full_name")
        if self.request.query_params.get("role") == "staff":
            qs = qs.filter(role__in=[Role.OWNER, Role.ADMIN, Role.AGENT])
        return qs


@extend_schema(tags=["Workspace"])
class InviteViewSet(WorkspaceViewMixin, mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = InviteSerializer
    pagination_class = None
    permission_classes = (IsAuthenticated, IsManager)

    def get_queryset(self):
        return Invite.objects.filter(workspace=self.request.workspace, accepted_at__isnull=True).order_by("-created_at")

    def perform_create(self, serializer):
        if self.request.workspace.is_demo:
            raise DomainError("Invites are disabled in demo workspaces.", code="demo_restricted", status_code=403)
        serializer.save(workspace=self.request.workspace, invited_by=self.request.user, token=new_invite_token())


@extend_schema(tags=["Workspace"])
class RecordViewSet(WorkspaceViewMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Requesters see their own items; staff can browse all (optionally `?owner=<user id>`)."""

    serializer_class = RecordSerializer
    pagination_class = None
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        qs = Record.objects.filter(workspace=self.request.workspace)
        if not self.request.membership.is_staff_member:
            return qs.filter(owner=self.request.user)
        if owner := self.request.query_params.get("owner"):
            qs = qs.filter(owner_id=owner)
        return qs


@extend_schema(tags=["Knowledge base"])
class ArticleViewSet(WorkspaceViewMixin, viewsets.ModelViewSet):
    pagination_class = None
    permission_classes = (IsAuthenticated, IsStaff)
    http_method_names = ("get", "post", "patch", "delete")

    def get_serializer_class(self):
        return ArticleListSerializer if self.action == "list" else ArticleSerializer

    def get_queryset(self):
        return Article.objects.filter(workspace=self.request.workspace).select_related("category")

    def get_permissions(self):
        if self.action in ("create", "partial_update", "destroy"):
            return [IsAuthenticated(), IsManager()]
        return super().get_permissions()

    def perform_create(self, serializer):
        article = serializer.save(workspace=self.request.workspace)
        reindex_article(article)

    def perform_update(self, serializer):
        article = serializer.save()
        reindex_article(article)

    @extend_schema(
        summary="Search the knowledge base (the same retrieval the AI drafts use)",
        parameters=[OpenApiParameter("q", str, required=True)],
        responses=inline_serializer("KBHit", fields={"article_id": serializers.IntegerField(), "title": serializers.CharField(),
                                                     "score": serializers.FloatField(), "text": serializers.CharField()}, many=True),
    )
    @action(detail=False, methods=["get"])
    def search(self, request, slug=None):
        q = request.query_params.get("q", "").strip()
        hits = retrieval.search(request.workspace.id, q, k=5) if q else []
        return Response([{"article_id": h.article_id, "title": h.title, "score": h.score, "text": h.text} for h in hits])


@extend_schema(
    tags=["Knowledge base"],
    summary="Self-service suggestions while a requester types a ticket (keyword retrieval, no AI quota used)",
    parameters=[OpenApiParameter("q", str, required=True)],
    responses=inline_serializer("Suggestion", fields={"article_id": serializers.IntegerField(), "title": serializers.CharField(),
                                                       "excerpt": serializers.CharField()}, many=True),
)
class SuggestionView(WorkspaceViewMixin, APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, slug=None):
        q = request.query_params.get("q", "").strip()
        if len(q) < 8:
            return Response([])
        hits = retrieval.search(request.workspace.id, q, k=3, include_internal=False, use_embeddings=False)
        return Response(
            [{"article_id": h.article_id, "title": h.title, "excerpt": (h.text[:220] + "…") if len(h.text) > 220 else h.text} for h in hits if h.score >= 1.2]
        )


@extend_schema(tags=["Tickets"])
class MacroViewSet(WorkspaceViewMixin, viewsets.ModelViewSet):
    serializer_class = MacroSerializer
    pagination_class = None
    permission_classes = (IsAuthenticated, IsStaff)
    http_method_names = ("get", "post", "patch", "delete")

    def get_queryset(self):
        return Macro.objects.filter(workspace=self.request.workspace)

    def perform_create(self, serializer):
        serializer.save(workspace=self.request.workspace)
