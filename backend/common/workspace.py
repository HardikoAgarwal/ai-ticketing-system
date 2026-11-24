"""Resolve the <slug> in /api/v1/w/<slug>/... to a workspace + the caller's membership.

Non-members get a 404 (never a 403) so workspace slugs can't be probed.
"""

from django.utils import timezone
from rest_framework.exceptions import NotFound

from common.exceptions import DomainError


class WorkspaceViewMixin:
    def initial(self, request, *args, **kwargs):
        self.perform_authentication(request)
        request.membership = None
        request.workspace = None
        if request.user.is_authenticated:
            from apps.workspaces.models import Membership

            membership = (
                Membership.objects.select_related("workspace")
                .filter(user=request.user, workspace__slug=kwargs.get("slug"))
                .first()
            )
            if membership is None:
                raise NotFound()
            ws = membership.workspace
            if ws.expires_at and ws.expires_at < timezone.now():
                raise DomainError("This demo workspace has expired.", code="workspace_expired", status_code=410)
            request.membership = membership
            request.workspace = ws
        super().initial(request, *args, **kwargs)
