"""Separate requester-facing and staff-facing representations.

Requesters never receive internal notes, triage data (category/priority/AI fields) or other
people's data; staff get the full picture.
"""

from django.conf import settings
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.workspaces.models import Category, Record
from apps.workspaces.serializers import CategoryBriefSerializer, RecordBriefSerializer, RecordSerializer, UserBriefSerializer

from .models import Attachment, Macro, MessageKind, Ticket, TicketActivity, TicketMessage, TicketPriority, TicketStatus

# --- Shared pieces -----------------------------------------------------------


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ("id", "original_name", "content_type", "size", "created_at")


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_is_requester = serializers.SerializerMethodField()
    is_internal = serializers.BooleanField(read_only=True)

    class Meta:
        model = TicketMessage
        fields = ("id", "kind", "is_internal", "body", "sender_name", "sender_is_requester", "created_at")

    def get_sender_name(self, obj) -> str:
        if not obj.sender:
            return self.context.get("team_name", "Support")
        return obj.sender.full_name

    def get_sender_is_requester(self, obj) -> bool:
        return bool(obj.sender_id and obj.sender_id == obj.ticket.requester_id)


class StaffMessageSerializer(MessageSerializer):
    class Meta(MessageSerializer.Meta):
        fields = MessageSerializer.Meta.fields + ("ai_draft_id", "ai_draft_edited")


class ActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", default=None, read_only=True)
    label = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = TicketActivity
        fields = ("id", "action", "label", "from_value", "to_value", "actor_name", "created_at")


# --- Requester-facing ----------------------------------------------------------


class RequesterTicketSerializer(serializers.ModelSerializer):
    reference = serializers.CharField(read_only=True)
    record = RecordBriefSerializer(read_only=True)
    has_unread = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Ticket
        fields = (
            "id", "reference", "subject", "description", "status", "status_label", "record", "has_unread",
            "created_at", "updated_at", "first_response_at", "resolved_at", "last_staff_reply_at", "csat_score",
        )

    def get_has_unread(self, obj) -> bool:
        return bool(
            obj.last_staff_reply_at
            and (not obj.requester_last_seen_at or obj.requester_last_seen_at < obj.last_staff_reply_at)
        )


class RequesterTicketDetailSerializer(RequesterTicketSerializer):
    messages = serializers.SerializerMethodField()
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta(RequesterTicketSerializer.Meta):
        fields = RequesterTicketSerializer.Meta.fields + ("messages", "attachments")

    @extend_schema_field(MessageSerializer(many=True))
    def get_messages(self, obj):
        visible = [m for m in obj.messages.all() if m.kind == MessageKind.REPLY]
        return MessageSerializer(visible, many=True, context=self.context).data


# --- Staff-facing --------------------------------------------------------------


class StaffTicketSerializer(serializers.ModelSerializer):
    reference = serializers.CharField(read_only=True)
    record = RecordBriefSerializer(read_only=True)
    category = CategoryBriefSerializer(read_only=True)
    ai_category = CategoryBriefSerializer(read_only=True)
    requester = serializers.SerializerMethodField()
    assigned_to = UserBriefSerializer(read_only=True)
    sla_state = serializers.CharField(read_only=True)
    has_unread = serializers.SerializerMethodField()
    unread_kind = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    priority_label = serializers.CharField(source="get_priority_display", read_only=True)

    class Meta:
        model = Ticket
        fields = (
            "id", "reference", "subject", "description", "status", "status_label",
            "category", "category_source", "ai_category",
            "priority", "priority_label", "priority_source", "ai_priority", "ai_confidence",
            "sentiment", "ai_summary", "ai_status", "ai_draft_status",
            "record", "requester", "assigned_to", "sla_due_at", "sla_state",
            "has_unread", "unread_kind", "first_response_at", "resolved_at", "csat_score",
            "created_at", "updated_at",
        )

    def get_requester(self, obj) -> dict:
        return {"id": obj.requester_id, "name": obj.requester.full_name, "email": obj.requester.email}

    def get_has_unread(self, obj) -> bool:
        return bool(
            obj.last_requester_activity_at
            and (not obj.staff_last_seen_at or obj.staff_last_seen_at < obj.last_requester_activity_at)
        )

    @extend_schema_field(serializers.ChoiceField(choices=["new_ticket", "requester_reply"], allow_null=True))
    def get_unread_kind(self, obj) -> str | None:
        if not self.get_has_unread(obj):
            return None
        replied = getattr(obj, "requester_replied", None)
        if replied is None:
            replied = obj.messages.filter(kind=MessageKind.REPLY, sender_id=obj.requester_id).exists()
        return "requester_reply" if replied else "new_ticket"


class StaffTicketDetailSerializer(StaffTicketSerializer):
    messages = StaffMessageSerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    activities = ActivitySerializer(many=True, read_only=True)
    record_detail = RecordSerializer(source="record", read_only=True)
    requester_profile = serializers.SerializerMethodField()

    class Meta(StaffTicketSerializer.Meta):
        fields = StaffTicketSerializer.Meta.fields + (
            "ai_reasoning", "ai_error", "csat_comment", "messages", "attachments", "activities", "record_detail",
            "requester_profile",
        )

    def get_requester_profile(self, obj) -> dict:
        membership = obj.requester.memberships.filter(workspace_id=obj.workspace_id).first()
        return {
            "name": obj.requester.full_name,
            "email": obj.requester.email,
            "company": membership.company if membership else "",
            "profile": membership.profile if membership else {},
            "joined": membership.joined_at if membership else None,
            "records_count": obj.requester.records.filter(workspace_id=obj.workspace_id).count(),
            "tickets_count": obj.requester.tickets.filter(workspace_id=obj.workspace_id).count(),
        }


# --- Inputs --------------------------------------------------------------------


class TicketCreateSerializer(serializers.Serializer):
    record_id = serializers.PrimaryKeyRelatedField(
        queryset=Record.objects.all(), source="record", required=False, allow_null=True,
        help_text="Omit or null for a general / account-level question.",
    )
    subject = serializers.CharField(min_length=5, max_length=150, trim_whitespace=True)
    description = serializers.CharField(min_length=20, max_length=5000, trim_whitespace=True)
    attachments = serializers.ListField(child=serializers.FileField(), required=False, allow_empty=True)

    def validate_record_id(self, record):
        request = self.context["request"]
        if record is not None and (record.owner_id != request.user.id or record.workspace_id != request.workspace.id):
            raise serializers.ValidationError("Select one of your own items, or leave it blank.")
        return record

    def validate_attachments(self, files):
        if len(files) > settings.ATTACHMENT_MAX_FILES:
            raise serializers.ValidationError(f"You can attach up to {settings.ATTACHMENT_MAX_FILES} files.")
        for f in files:
            if f.size > settings.ATTACHMENT_MAX_BYTES:
                raise serializers.ValidationError(f"'{f.name}' is larger than 10 MB.")
            if getattr(f, "content_type", None) not in settings.ATTACHMENT_ALLOWED_TYPES:
                raise serializers.ValidationError(f"'{f.name}' is not supported. Use PDF, PNG, JPG or WEBP.")
        return files


class StaffTicketUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=TicketStatus.choices, required=False)
    category = serializers.SlugRelatedField(slug_field="key", queryset=Category.objects.all(), required=False)
    priority = serializers.ChoiceField(choices=TicketPriority.choices, required=False)
    assigned_to = serializers.IntegerField(required=False, allow_null=True, help_text="User id of a staff member, or null")

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide at least one of: status, category, priority, assigned_to.")
        return attrs


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(min_length=1, max_length=5000, trim_whitespace=True)
    kind = serializers.ChoiceField(choices=[MessageKind.REPLY, MessageKind.NOTE], default=MessageKind.REPLY)
    ai_draft_id = serializers.IntegerField(required=False, allow_null=True)
    resolve = serializers.BooleanField(default=False)


class ConfirmResolutionSerializer(serializers.Serializer):
    resolved = serializers.BooleanField()
    message = serializers.CharField(required=False, allow_blank=True, max_length=5000)


class CSATSerializer(serializers.Serializer):
    score = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, max_length=500)


class DraftSerializer(serializers.Serializer):
    status = serializers.CharField(help_text="ready | generating | failed | disabled")
    draft = serializers.DictField(allow_null=True)
    error = serializers.CharField(allow_blank=True)


class NotificationSerializer(serializers.Serializer):
    id = serializers.CharField()
    kind = serializers.CharField(help_text="Requesters: staff_reply | resolved. Staff: new_ticket | requester_reply")
    ticket_id = serializers.IntegerField()
    reference = serializers.CharField()
    subject = serializers.CharField()
    preview = serializers.CharField()
    actor_name = serializers.CharField()
    at = serializers.DateTimeField(allow_null=True)
    priority = serializers.CharField(required=False, help_text="Staff only")
    owner = serializers.CharField(required=False, help_text="Staff only: you | unassigned")


class NotificationFeedSerializer(serializers.Serializer):
    count = serializers.IntegerField(help_text="Total items needing attention (the list is capped at 20)")
    items = NotificationSerializer(many=True)


class MacroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Macro
        fields = ("id", "title", "body")
