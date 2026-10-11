from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView

from common.permissions import IsAdmin

from .models import User
from .serializers import LoginSerializer, UserBriefSerializer, UserSerializer


@extend_schema(tags=["Auth"], summary="Log in with email and password; returns JWT pair and user profile")
class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "login"


@extend_schema(tags=["Auth"], summary="Current authenticated user")
class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


@extend_schema(tags=["Admin"], summary="List BookLeaf team members (for ticket assignment)")
class AgentListView(generics.ListAPIView):
    serializer_class = UserBriefSerializer
    permission_classes = (IsAdmin,)
    pagination_class = None

    def get_queryset(self):
        return User.objects.filter(role=User.Role.ADMIN, is_active=True).order_by("full_name")
