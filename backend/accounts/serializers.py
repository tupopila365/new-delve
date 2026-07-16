import re

from django.contrib.auth.password_validation import validate_password
from django.utils.text import slugify
from rest_framework import serializers

from .models import (
    BusinessProfile,
    BusinessType,
    BusinessVerificationDocument,
    Profile,
    User,
    UserType,
)


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
            "no_face_mode",
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
    avatar = serializers.ImageField(required=False, allow_null=True)

    def validate_avatar(self, value):
        if value is None or value is False:
            return None
        return value

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
            "no_face_mode",
        )
        read_only_fields = ("user_type",)


class BusinessProfileSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    stats = serializers.SerializerMethodField()

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
            "onboarding_completed",
            "transport_modes",
            "verification_notes",
            "stats",
        )

    def get_stats(self, obj: BusinessProfile) -> dict:
        from accounts.business_listings import business_stats

        return business_stats(obj)


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
            "onboarding_completed",
            "transport_modes",
            "verification_notes",
            "role",
            "permissions",
        )

    def get_role(self, obj):
        perms_map = self.context.get("permissions_map") or {}
        return perms_map.get(obj.pk, {}).get("role")

    def get_permissions(self, obj):
        perms_map = self.context.get("permissions_map") or {}
        return perms_map.get(obj.pk, {}).get("permissions", {})


def _unique_business_slug(base: str) -> str:
    slug = slugify(base)[:70] or "business"
    candidate = slug
    n = 1
    while BusinessProfile.objects.filter(slug=candidate).exists():
        n += 1
        candidate = f"{slug}-{n}"
    return candidate


class CreateBusinessSerializer(serializers.Serializer):
    business_name = serializers.CharField(max_length=160)
    business_types = serializers.ListField(
        child=serializers.ChoiceField(choices=BusinessType.choices),
        min_length=1,
    )
    tagline = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")
    region = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    city = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    transport_modes = serializers.ListField(
        child=serializers.ChoiceField(choices=[("rental", "Vehicle rentals"), ("shared", "Shared passenger transport")]),
        required=False,
        allow_empty=True,
    )

    def validate_business_types(self, value):
        cleaned = list(dict.fromkeys(value))
        if BusinessType.MULTI_PROVIDER in cleaned and len(cleaned) > 1:
            cleaned = [t for t in cleaned if t != BusinessType.MULTI_PROVIDER]
        if len(cleaned) > 1 and BusinessType.MULTI_PROVIDER not in cleaned:
            cleaned.append(BusinessType.MULTI_PROVIDER)
        return cleaned

    def create(self, validated_data):
        user = self.context["request"].user
        business = BusinessProfile.objects.create(
            owner=user,
            slug=_unique_business_slug(validated_data["business_name"]),
            business_name=validated_data["business_name"].strip(),
            business_types=validated_data["business_types"],
            tagline=validated_data.get("tagline", ""),
            description=validated_data.get("description", ""),
            region=validated_data.get("region", ""),
            city=validated_data.get("city", ""),
            transport_modes=validated_data.get("transport_modes", []),
        )
        return business


class UpdateMyBusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessProfile
        fields = (
            "business_name",
            "business_types",
            "tagline",
            "description",
            "region",
            "city",
            "logo",
            "cover_image",
            "onboarding_completed",
            "transport_modes",
        )

    def validate_business_types(self, value):
        if not value:
            raise serializers.ValidationError("Select at least one service type.")
        cleaned = list(dict.fromkeys(value))
        if len(cleaned) > 1 and BusinessType.MULTI_PROVIDER not in cleaned:
            cleaned.append(BusinessType.MULTI_PROVIDER)
        return cleaned


class BusinessVerificationDocumentSerializer(serializers.ModelSerializer):
    doc_type_label = serializers.CharField(source="get_doc_type_display", read_only=True)

    class Meta:
        model = BusinessVerificationDocument
        fields = (
            "id",
            "doc_type",
            "doc_type_label",
            "file",
            "status",
            "notes",
            "uploaded_at",
        )
        read_only_fields = ("status", "uploaded_at")


class PublicProfileSerializer(serializers.ModelSerializer):
    """Public fields for /@username-style profile pages (no email)."""

    id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    stats = serializers.SerializerMethodField()
    relationship = serializers.SerializerMethodField()
    owned_businesses = serializers.SerializerMethodField()
    has_auto_welcome = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = (
            "id",
            "username",
            "display_name",
            "bio",
            "region",
            "city",
            "avatar",
            "user_type",
            "is_private",
            "posts_visibility",
            "allow_messages",
            "has_auto_welcome",
            "stats",
            "relationship",
            "owned_businesses",
        )

    def get_owned_businesses(self, obj: Profile) -> list[dict]:
        return list(
            BusinessProfile.objects.filter(owner=obj.user)
            .order_by("business_name")
            .values("id", "business_name", "verification_status", "slug")
        )

    def get_stats(self, obj: Profile) -> dict:
        from accounts.profile_stats import compute_profile_stats

        return compute_profile_stats(obj.user)

    def get_relationship(self, obj: Profile) -> dict:
        from accounts.profile_access import get_profile_relationship

        request = self.context.get("request")
        viewer = request.user if request else None
        return get_profile_relationship(viewer, obj.user)

    def get_has_auto_welcome(self, obj: Profile) -> bool:
        from messaging.provider_messaging import provider_has_auto_welcome

        return provider_has_auto_welcome(obj.user)

    def to_representation(self, instance):
        from accounts.profile_access import can_view_posts

        data = super().to_representation(instance)
        request = self.context.get("request")
        viewer = request.user if request else None
        if can_view_posts(viewer, instance.user):
            return data
        return {
            "id": data["id"],
            "username": data["username"],
            "display_name": data.get("display_name"),
            "avatar": data.get("avatar"),
            "is_private": data["is_private"],
            "user_type": data.get("user_type"),
            "has_auto_welcome": data.get("has_auto_welcome", False),
            "relationship": data["relationship"],
        }
