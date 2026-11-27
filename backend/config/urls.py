from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from apps.tickets.inbound import InboundEmailView
from apps.workspaces.workspace_requests import WorkspaceRequestView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


_swept_at_boot = False


def health(_request):
    """Liveness probe. Deliberately DB-free so keep-alive pings never wake the (scale-to-zero) database.

    The first probe after a process start also re-dispatches background jobs a restart may have
    stranded; that single sweep is the only database touch.
    """
    global _swept_at_boot
    if not _swept_at_boot:
        _swept_at_boot = True
        try:
            from apps.jobs import runner

            runner.sweep()
        except Exception:  # noqa: BLE001 - a DB hiccup must not fail the probe
            pass
    return JsonResponse({"status": "ok"})


api_v1 = [
    path("auth/", include("apps.accounts.urls")),
    path("demo/", include("apps.demo.urls")),
    path("inbound/email/", InboundEmailView.as_view(), name="inbound-email"),
    path("workspace-requests/", WorkspaceRequestView.as_view(), name="workspace-requests"),
    path("w/<slug:slug>/", include("apps.workspaces.urls")),
    path("w/<slug:slug>/", include("apps.tickets.urls")),
    path("w/<slug:slug>/", include("apps.analytics.urls")),
]

urlpatterns = [
    path("health/", health),
    path("django-admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
