from django.urls import path
from drf_spectacular.utils import extend_schema_view, extend_schema
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginView, MeView

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path(
        "refresh/",
        extend_schema_view(post=extend_schema(tags=["Auth"], summary="Exchange refresh token for a new access token"))(
            TokenRefreshView
        ).as_view(),
        name="auth-refresh",
    ),
    path("me/", MeView.as_view(), name="auth-me"),
]
