from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.workspaces.models import Invite, Membership
from apps.workspaces.services import create_workspace
from common.exceptions import DomainError

from .models import User
from .serializers import AcceptInviteSerializer, LoginSerializer, RegisterSerializer, UserSerializer, tokens_for


@extend_schema(tags=["Auth"], summary="Log in with email and password; returns JWT pair and user profile")
class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "login"


@extend_schema(tags=["Auth"], summary="Current authenticated user and their workspace memberships")
class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


@extend_schema(
    tags=["Auth"],
    summary="Create an account and your own workspace (you become its owner)",
    request=RegisterSerializer,
    responses=UserSerializer,
)
class RegisterView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "register"

    @transaction.atomic
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = User.objects.create_user(email=data["email"], password=data["password"], full_name=data["full_name"])
        workspace = create_workspace(name=data["workspace_name"], owner=user)
        return Response(
            {**tokens_for(user), "user": UserSerializer(user).data, "workspace_slug": workspace.slug},
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Auth"], summary="Accept a workspace invite by creating your account", request=AcceptInviteSerializer, responses=UserSerializer)
class AcceptInviteView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "register"

    @transaction.atomic
    def post(self, request):
        serializer = AcceptInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        invite = Invite.objects.select_related("workspace").filter(token=data["token"], accepted_at__isnull=True).first()
        if invite is None:
            raise DomainError("This invite is invalid or was already used.", code="invalid_invite", status_code=400)
        existing = User.objects.filter(email__iexact=invite.email).first()
        if existing and existing.has_usable_password():
            raise DomainError("An account with this email already exists. Log in, then ask an admin to add you.", code="conflict")
        if existing:
            # a customer who only ever wrote in by email has an account but no password: the invite link is how they get one
            user = existing
            user.full_name = data["full_name"]
            user.set_password(data["password"])
            user.save(update_fields=["full_name", "password"])
            Membership.objects.update_or_create(workspace=invite.workspace, user=user, defaults={"role": invite.role})
        else:
            user = User.objects.create_user(email=invite.email.lower(), password=data["password"], full_name=data["full_name"])
            Membership.objects.create(workspace=invite.workspace, user=user, role=invite.role)
        invite.accepted_at = timezone.now()
        invite.save(update_fields=["accepted_at"])
        return Response({**tokens_for(user), "user": UserSerializer(user).data, "workspace_slug": invite.workspace.slug}, status=201)
