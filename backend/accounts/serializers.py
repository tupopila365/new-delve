import re

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import BusinessProfile, Profile, User, UserType


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    is_staff = serializers.BooleanField(source="user.is_staff", read_only=True)

    class Meta:
        model = Profile
        fields = (
            "username",
            "email",
            "user_type",
            "is_staff",
            "display_name",
            "bio",
            "region",
            "city",
            "country_code",
            "preferred_currency",
            "avatar",
            "email_verified",
            "is_private",
            "posts_visibility",
            "allow_messages",
            "show_in_search",
        )
        read_only_fields = ("email_verified", "user_type", "is_staff")


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
    def validate_country_code(self, value: str) -> str:
        v = (value or "").strip().upper()
        if not v:
            return ""
        if not re.fullmatch(r"[A-Z]{2}", v):
            raise serializers.ValidationError("Use a 2-letter country code (ISO 3166-1).")
        return v

    def validate_preferred_currency(self, value: str) -> str:
        v = (value or "").strip().upper()
        if not v:
            return ""
        if not re.fullmatch(r"[A-Z]{3}", v):
            raise serializers.ValidationError("Use a 3-letter currency code (ISO 4217).")
        return v

    class Meta:
        model = Profile
        fields = (
            "display_name",
            "bio",
            "region",
            "city",
            "country_code",
            "preferred_currency",
            "avatar",
            "user_type",
            "is_private",
            "posts_visibility",
            "allow_messages",
            "show_in_search",
        )


class BusinessProfileSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = BusinessProfile
        fields = (
            "id",
            "slug",
            "owner_username",
            "business_name",
            "business_types",
            "verification_status",
            "description",
            "tagline",
            "logo",
            "cover_image",
            "region",
            "city",
        )


class MyBusinessSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    role = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = BusinessProfile
        fields = (
            "id",
            "slug",
            "owner_username",
            "business_name",
            "business_types",
            "verification_status",
            "description",
            "tagline",
            "logo",
            "cover_image",
            "region",
            "city",
            "role",
            "permissions",
        )

    def get_role(self, obj):
        perms_map = self.context.get("permissions_map") or {}
        return perms_map.get(obj.pk, {}).get("role")

    def get_permissions(self, obj):
        perms_map = self.context.get("permissions_map") or {}
        return perms_map.get(obj.pk, {}).get("permissions", {})


class PublicProfileSerializer(serializers.ModelSerializer):
    """Public fields for /@username-style profile pages (no email)."""

    id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Profile
        fields = ("id", "username", "display_name", "bio", "region", "city", "avatar", "user_type", "is_private", "posts_visibility", "allow_messages")
