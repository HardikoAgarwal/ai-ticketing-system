from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import AuthorProfile, User


class AuthorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuthorProfile
        fields = ("author_code", "phone", "city", "joined_date")


class UserSerializer(serializers.ModelSerializer):
    author_profile = AuthorProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "role", "author_profile")


class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "full_name", "email", "role")


class LoginSerializer(TokenObtainPairSerializer):
    default_error_messages = {"no_active_account": "Incorrect email or password."}

    def validate(self, attrs):
        attrs[self.username_field] = attrs.get(self.username_field, "").strip().lower()
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token
