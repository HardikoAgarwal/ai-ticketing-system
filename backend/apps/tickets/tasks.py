from apps.jobs import runner
from apps.workspaces.models import Workspace

from . import services


@runner.task("tickets.auto_close")
def auto_close(workspace_id: int) -> None:
    workspace = Workspace.objects.filter(pk=workspace_id).first()
    if workspace:
        services.auto_close_resolved(workspace)
