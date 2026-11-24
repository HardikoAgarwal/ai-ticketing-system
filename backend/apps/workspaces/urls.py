from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ArticleViewSet,
    CategoryViewSet,
    InviteViewSet,
    MacroViewSet,
    MemberViewSet,
    RecordViewSet,
    SuggestionView,
    WorkspaceDetailView,
)

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("members", MemberViewSet, basename="member")
router.register("invites", InviteViewSet, basename="invite")
router.register("records", RecordViewSet, basename="record")
router.register("articles", ArticleViewSet, basename="article")
router.register("macros", MacroViewSet, basename="macro")

urlpatterns = [
    path("", WorkspaceDetailView.as_view(), name="workspace-detail"),
    path("suggestions/", SuggestionView.as_view(), name="suggestions"),
    path("", include(router.urls)),
]
