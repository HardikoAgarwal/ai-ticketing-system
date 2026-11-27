from django.contrib import admin

from .models import Category, Invite, Membership, Record, Workspace, WorkspaceRequest

admin.site.register([Workspace, Membership, Category, Record, Invite])


@admin.register(WorkspaceRequest)
class WorkspaceRequestAdmin(admin.ModelAdmin):
    """Inbox for the landing page's request form: newest first, tick "handled" straight from the list."""

    list_display = ("created_at", "full_name", "email", "company", "team_size", "handled")
    list_display_links = ("created_at", "full_name")
    list_editable = ("handled",)
    list_filter = ("handled",)
    search_fields = ("full_name", "email", "company", "message")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"
