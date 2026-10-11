from django.urls import path

from apps.accounts.views import AgentListView

from .views import AnalyticsSummaryView

urlpatterns = [
    path("agents/", AgentListView.as_view(), name="admin-agents"),
    path("analytics/summary/", AnalyticsSummaryView.as_view(), name="admin-analytics"),
]
