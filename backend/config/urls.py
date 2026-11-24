from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health(_request):
    """Liveness probe. Also nudges the job sweeper (at most every 30s) so a restart never strands work."""
    from django.core.cache import cache

    from apps.jobs import runner

    if cache.add("jobs:sweep", 1, 30):
        try:
            runner.sweep()
        except Exception:  # noqa: BLE001 - a DB hiccup must not fail the probe
            pass
    return JsonResponse({"status": "ok"})


api_v1 = [
    path("auth/", include("apps.accounts.urls")),
    path("demo/", include("apps.demo.urls")),
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
