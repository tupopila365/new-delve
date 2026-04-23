from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Profile, User, UserType


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Profile
        fields = (
            "username",
            "email",
            "user_type",
            "display_name",
            "bio",
            "region",
            "city",
            "avatar",
            "email_verified",
        )
        read_only_fields = ("email_verified", "user_type")


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=3, max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    user_type = serializers.ChoiceField(choices=UserType.choices, default=UserType.NORMAL)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Username is already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email is already registered.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        profile = user.profile
        profile.user_type = validated_data["user_type"]
        profile.save(update_fields=["user_type"])
        return user


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ("display_name", "bio", "region", "city", "avatar", "user_type")


class PublicProfileSerializer(serializers.ModelSerializer):
    """Public fields for /@username-style profile pages (no email)."""

    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Profile
        fields = ("username", "display_name", "bio", "region", "city", "avatar", "user_type")
