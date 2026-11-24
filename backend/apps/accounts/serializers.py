from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.workspaces.serializers import WorkspaceBriefSerializer

from .models import User


class MembershipRefSerializer(serializers.Serializer):
    workspace = WorkspaceBriefSerializer(read_only=True)
    role = serializers.CharField()
    company = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    memberships = MembershipRefSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "is_demo", "memberships")


class LoginSerializer(TokenObtainPairSerializer):
    default_error_messages = {"no_active_account": "Incorrect email or password."}

    def validate(self, attrs):
        attrs[self.username_field] = attrs.get(self.username_field, "").strip().lower()
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(min_length=2, max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    workspace_name = serializers.CharField(min_length=2, max_length=120)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value


class AcceptInviteSerializer(serializers.Serializer):
    token = serializers.CharField()
    full_name = serializers.CharField(min_length=2, max_length=150)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)


def tokens_for(user) -> dict:
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}
