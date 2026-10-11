from django.contrib import admin

from .models import Attachment, Ticket, TicketActivity, TicketMessage


class MessageInline(admin.TabularInline):
    model = TicketMessage
    extra = 0
    fields = ("kind", "sender", "body", "created_at")


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("id", "subject", "author", "status", "category", "priority", "assigned_to", "created_at")
    list_filter = ("status", "category", "priority", "ai_status")
    search_fields = ("subject", "description", "author__user__full_name")
    inlines = [MessageInline]


admin.site.register(Attachment)
admin.site.register(TicketActivity)
