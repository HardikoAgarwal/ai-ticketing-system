from rest_framework import serializers

from apps.accounts.models import User

from .models import Category, Invite, Membership, Record, Workspace


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "key", "name", "description", "keywords", "is_default", "position")


class CategoryBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "key", "name")


class RecordBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Record
        fields = ("id", "kind", "reference", "title", "status")


class RecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Record
        fields = ("id", "kind", "reference", "title", "status", "data", "created_at")


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = (
            "id", "name", "slug", "template", "tagline", "agent_title", "tone", "sla_hours",
            "ai_enabled", "auto_close_days", "is_demo", "expires_at", "created_at",
        )
        read_only_fields = ("id", "slug", "template", "is_demo", "expires_at", "created_at")
        extra_kwargs = {"auto_close_days": {"min_value": 0, "max_value": 90}}


class WorkspaceBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ("id", "name", "slug", "tagline", "is_demo", "expires_at")


class MembershipSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="user_id", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Membership
        fields = ("id", "full_name", "email", "role", "company", "profile", "joined_at")


class MemberBriefSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="user_id", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Membership
        fields = ("id", "full_name", "email", "role")


class InviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invite
        fields = ("id", "email", "role", "token", "accepted_at", "created_at")
        read_only_fields = ("token", "accepted_at", "created_at")


class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "full_name", "email")
