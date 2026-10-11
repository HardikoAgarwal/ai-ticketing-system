"""Separate author-facing and admin-facing representations.

Authors never receive internal notes, triage data (category/priority/AI
fields) or other authors' data; admins get the full picture.
"""

from django.conf import settings
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.accounts.models import User
from apps.accounts.serializers import UserBriefSerializer
from apps.catalog.models import Book
from apps.catalog.serializers import BookBriefSerializer, BookSerializer

from .models import (
    Attachment,
    MessageKind,
    Ticket,
    TicketActivity,
    TicketCategory,
    TicketMessage,
    TicketPriority,
    TicketStatus,
)

# --- Shared pieces -----------------------------------------------------------


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ("id", "original_name", "content_type", "size", "created_at")


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    is_internal = serializers.BooleanField(read_only=True)

    class Meta:
        model = TicketMessage
        fields = ("id", "kind", "is_internal", "body", "sender_name", "sender_role", "created_at")

    def get_sender_name(self, obj) -> str:
        if not obj.sender:
            return "BookLeaf"
        return obj.sender.full_name

    def get_sender_role(self, obj) -> str:
        return obj.sender.role if obj.sender else "SYSTEM"


class AdminMessageSerializer(MessageSerializer):
    class Meta(MessageSerializer.Meta):
        fields = MessageSerializer.Meta.fields + ("ai_draft_id", "ai_draft_edited")


class ActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", default=None, read_only=True)
    label = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = TicketActivity
        fields = ("id", "action", "label", "from_value", "to_value", "actor_name", "created_at")


# --- Author-facing -------------------------------------------------------------


class AuthorTicketSerializer(serializers.ModelSerializer):
    reference = serializers.CharField(read_only=True)
    book = BookBriefSerializer(read_only=True)
    has_unread = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Ticket
        fields = (
            "id",
            "reference",
            "subject",
            "description",
            "status",
            "status_label",
            "book",
            "has_unread",
            "created_at",
            "updated_at",
            "first_response_at",
            "resolved_at",
            "last_admin_reply_at",
        )

    def get_has_unread(self, obj) -> bool:
        return bool(obj.last_admin_reply_at and (not obj.author_last_seen_at or obj.author_last_seen_at < obj.last_admin_reply_at))


class AuthorTicketDetailSerializer(AuthorTicketSerializer):
    messages = serializers.SerializerMethodField()
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta(AuthorTicketSerializer.Meta):
        fields = AuthorTicketSerializer.Meta.fields + ("messages", "attachments")

    @extend_schema_field(MessageSerializer(many=True))
    def get_messages(self, obj):
        visible = [m for m in obj.messages.all() if m.kind == MessageKind.REPLY]
        return MessageSerializer(visible, many=True).data


# --- Admin-facing --------------------------------------------------------------


class AdminTicketSerializer(serializers.ModelSerializer):
    reference = serializers.CharField(read_only=True)
    book = BookBriefSerializer(read_only=True)
    author = serializers.SerializerMethodField()
    assigned_to = UserBriefSerializer(read_only=True)
    sla_state = serializers.CharField(read_only=True)
    has_unread = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    priority_label = serializers.CharField(source="get_priority_display", read_only=True)

    class Meta:
        model = Ticket
        fields = (
            "id",
            "reference",
            "subject",
            "description",
            "status",
            "status_label",
            "category",
            "category_label",
            "category_source",
            "ai_category",
            "priority",
            "priority_label",
            "priority_source",
            "ai_priority",
            "ai_confidence",
            "ai_status",
            "ai_draft_status",
            "book",
            "author",
            "assigned_to",
            "sla_due_at",
            "sla_state",
            "has_unread",
            "first_response_at",
            "resolved_at",
            "created_at",
            "updated_at",
        )

    def get_author(self, obj) -> dict:
        return {
            "id": obj.author.user_id,
            "name": obj.author.user.full_name,
            "email": obj.author.user.email,
            "author_code": obj.author.author_code,
        }

    def get_has_unread(self, obj) -> bool:
        return bool(
            obj.last_author_activity_at
            and (not obj.admin_last_seen_at or obj.admin_last_seen_at < obj.last_author_activity_at)
        )


class AdminTicketDetailSerializer(AdminTicketSerializer):
    messages = AdminMessageSerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    activities = ActivitySerializer(many=True, read_only=True)
    book_detail = BookSerializer(source="book", read_only=True)
    author_profile = serializers.SerializerMethodField()

    class Meta(AdminTicketSerializer.Meta):
        fields = AdminTicketSerializer.Meta.fields + (
            "ai_reasoning",
            "ai_error",
            "messages",
            "attachments",
            "activities",
            "book_detail",
            "author_profile",
        )

    def get_author_profile(self, obj) -> dict:
        profile = obj.author
        return {
            "author_code": profile.author_code,
            "name": profile.user.full_name,
            "email": profile.user.email,
            "phone": profile.phone,
            "city": profile.city,
            "joined_date": profile.joined_date,
            "books_count": profile.books.count(),
            "tickets_count": profile.tickets.count(),
        }


# --- Inputs --------------------------------------------------------------------


class TicketCreateSerializer(serializers.Serializer):
    book_id = serializers.PrimaryKeyRelatedField(
        queryset=Book.objects.all(), source="book", required=False, allow_null=True,
        help_text="Omit or null for 'General / Account Level'.",
    )
    subject = serializers.CharField(min_length=5, max_length=150, trim_whitespace=True)
    description = serializers.CharField(min_length=20, max_length=5000, trim_whitespace=True)
    attachments = serializers.ListField(child=serializers.FileField(), required=False, allow_empty=True)

    def validate_book_id(self, book):
        request = self.context["request"]
        if book is not None and book.author.user_id != request.user.id:
            raise serializers.ValidationError("Select one of your own books, or 'General / Account Level'.")
        return book

    def validate_attachments(self, files):
        if len(files) > settings.ATTACHMENT_MAX_FILES:
            raise serializers.ValidationError(f"You can attach up to {settings.ATTACHMENT_MAX_FILES} files.")
        for f in files:
            if f.size > settings.ATTACHMENT_MAX_BYTES:
                raise serializers.ValidationError(f"'{f.name}' is larger than 10 MB.")
            if getattr(f, "content_type", None) not in settings.ATTACHMENT_ALLOWED_TYPES:
                raise serializers.ValidationError(f"'{f.name}' is not supported. Use PDF, PNG, JPG or WEBP.")
        return files


class AdminTicketUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=TicketStatus.choices, required=False)
    category = serializers.ChoiceField(choices=TicketCategory.choices, required=False)
    priority = serializers.ChoiceField(choices=TicketPriority.choices, required=False)
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.ADMIN, is_active=True), required=False, allow_null=True
    )

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


class DraftSerializer(serializers.Serializer):
    status = serializers.CharField(help_text="ready | generating | failed | disabled")
    draft = serializers.DictField(allow_null=True)
    error = serializers.CharField(allow_blank=True)
