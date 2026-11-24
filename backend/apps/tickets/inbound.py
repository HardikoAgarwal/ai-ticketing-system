"""Inbound email webhook: turns an email forwarded by a mail provider into a ticket.

Authenticated with a shared secret (X-Inbound-Secret == settings.INBOUND_EMAIL_SECRET). The
endpoint 404s when no secret is configured, and never operates on demo workspaces.
"""

import hmac

from django.conf import settings
from django.http import Http404
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.workspaces.models import Membership, Role, Workspace
from common.exceptions import DomainError

from . import services


class InboundEmailSerializer(serializers.Serializer):
    workspace = serializers.SlugField()
    from_email = serializers.EmailField()
    from_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    subject = serializers.CharField(max_length=150, trim_whitespace=True)
    body = serializers.CharField(max_length=5000, trim_whitespace=True)


@extend_schema(tags=["Channels"], summary="Create a ticket from an inbound email (shared-secret webhook)", request=InboundEmailSerializer, responses=None)
class InboundEmailView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)

    def post(self, request):
        secret = getattr(settings, "INBOUND_EMAIL_SECRET", "")
        if not secret:
            raise Http404()
        if not hmac.compare_digest(request.headers.get("X-Inbound-Secret", ""), secret):
            raise DomainError("Invalid inbound secret.", code="unauthorized", status_code=401)

        serializer = InboundEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        workspace = Workspace.objects.filter(slug=data["workspace"], is_demo=False).first()
        if workspace is None:
            raise Http404()

        email = data["from_email"].strip().lower()
        user = User.objects.filter(email=email).first()
        if user is None:
            name = data.get("from_name") or email.split("@")[0]
            user = User(email=email, full_name=name[:150])
            user.set_unusable_password()
            user.save()
        membership, _ = Membership.objects.get_or_create(workspace=workspace, user=user, defaults={"role": Role.REQUESTER})
        if membership.is_staff_member:
            raise DomainError("Staff cannot raise tickets by email; reply in the app.", code="forbidden", status_code=403)

        body = data["body"] if len(data["body"]) >= 20 else data["body"].ljust(20, ".")
        ticket = services.create_ticket(workspace=workspace, requester=user, subject=data["subject"].ljust(5, "."), description=body)
        return Response({"id": ticket.id, "reference": ticket.reference}, status=201)
