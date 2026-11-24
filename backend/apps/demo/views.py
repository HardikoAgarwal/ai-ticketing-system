from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.serializers import UserSerializer, tokens_for
from apps.workspaces.models import Workspace
from apps.workspaces.services import purge_expired_demos
from common.exceptions import DomainError
from django.conf import settings

from .seed import build_workspace
from .templates_data import TEMPLATE_CHOICES, TEMPLATES


class DemoStartSerializer(serializers.Serializer):
    template = serializers.ChoiceField(choices=list(TEMPLATES), default="saas")


@extend_schema(tags=["Demo"], summary="Available sandbox templates", responses=None)
class DemoTemplatesView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        return Response(TEMPLATE_CHOICES)


@extend_schema(
    tags=["Demo"],
    summary="Spin up a private, pre-filled sandbox workspace; returns tokens for an agent view and a customer view",
    request=DemoStartSerializer,
    responses=None,
)
class DemoStartView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "demo_start"

    def post(self, request):
        serializer = DemoStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        purge_expired_demos()
        if Workspace.objects.filter(is_demo=True).count() >= settings.DEMO_MAX_ACTIVE:
            raise DomainError("The demo is at capacity right now. Please try again in a few minutes.", code="demo_capacity", status_code=503)
        built = build_workspace(serializer.validated_data["template"])
        ws, agent, customer = built["workspace"], built["visitor"], built["customer"]
        return Response(
            {
                "workspace_slug": ws.slug,
                "expires_at": ws.expires_at,
                "agent": {**tokens_for(agent), "user": UserSerializer(agent).data},
                "customer": {**tokens_for(customer), "user": UserSerializer(customer).data},
            },
            status=201,
        )
