"""Public "request a workspace" form on the landing page.

There is no self-serve signup, so a team asks for a workspace here. Requests are only stored: nothing is
emailed, and they are read in the Django admin (Workspaces > Workspace requests).
"""

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import WorkspaceRequest


class WorkspaceRequestSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(min_length=2, max_length=150)
    company = serializers.CharField(min_length=2, max_length=150)
    team_size = serializers.CharField(max_length=60, required=False, allow_blank=True)
    message = serializers.CharField(min_length=10, max_length=2000)

    class Meta:
        model = WorkspaceRequest
        fields = ("full_name", "email", "company", "team_size", "message", "created_at")
        read_only_fields = ("created_at",)

    def validate_email(self, value):
        return value.strip().lower()


@extend_schema(tags=["Workspace requests"], summary="Ask for a workspace (public landing-page form)", request=WorkspaceRequestSerializer, responses={201: WorkspaceRequestSerializer})
class WorkspaceRequestView(APIView):
    # No authentication at all: a visitor with a stale token in their browser must still be able to send the form.
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "workspace_request"

    def post(self, request):
        serializer = WorkspaceRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
