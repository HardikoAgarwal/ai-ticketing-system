from django.urls import path
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework_simplejwt.views import TokenRefreshView

from .views import AcceptInviteView, LoginView, MeView, RegisterView

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("accept-invite/", AcceptInviteView.as_view(), name="auth-accept-invite"),
    path(
        "refresh/",
        extend_schema_view(post=extend_schema(tags=["Auth"], summary="Exchange refresh token for a new access token"))(
            TokenRefreshView
        ).as_view(),
        name="auth-refresh",
    ),
    path("me/", MeView.as_view(), name="auth-me"),
]
