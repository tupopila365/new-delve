import re
import uuid

from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.utils.text import slugify
from rest_framework import serializers

from .age_gate import validate_account_birth_year
from .models import (
    BusinessProfile,
    BusinessType,
    BusinessVerificationDocument,
    ListingSale,
    PendingRegistration,
    Profile,
    TravelOffer,
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
            "birth_year",
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
    birth_year = serializers.IntegerField()
    user_type = serializers.ChoiceField(choices=UserType.choices, default=UserType.NORMAL)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Username is already taken.")
        # Same email re-register may keep the pending username; other pendings block.
        pending = PendingRegistration.objects.filter(username__iexact=value).first()
        if pending and pending.email.lower() != (self.initial_data.get("email") or "").strip().lower():
            raise serializers.ValidationError("Username is already taken.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email is already registered.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_birth_year(self, value):
        try:
            return validate_account_birth_year(value, required=True)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def create(self, validated_data):
        from django.utils import timezone

        email = validated_data["email"].strip().lower()
        username = validated_data["username"]
        # Drop any other pending that held this username under a different email.
        PendingRegistration.objects.filter(username__iexact=username).exclude(email__iexact=email).delete()
        pending, created = PendingRegistration.objects.update_or_create(
            email=email,
            defaults={
                "username": username,
                "password_hash": make_password(validated_data["password"]),
                "birth_year": validated_data["birth_year"],
                "user_type": validated_data["user_type"],
                "token": uuid.uuid4(),
            },
        )
        if not created:
            PendingRegistration.objects.filter(pk=pending.pk).update(created_at=timezone.now())
            pending.refresh_from_db()
        return pending


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

    def validate_birth_year(self, value):
        try:
            return validate_account_birth_year(value, required=False)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    class Meta:
        model = Profile
        fields = (
            "display_name",
            "bio",
            "region",
            "city",
            "country_code",
            "birth_year",
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


class TravelOfferSerializer(serializers.ModelSerializer):
    eligibility_display = serializers.SerializerMethodField()

    class Meta:
        model = TravelOffer
        fields = (
            "id",
            "title",
            "summary",
            "offer_kind",
            "eligibility",
            "eligibility_label",
            "eligibility_display",
            "min_age",
            "max_age",
            "min_party_size",
            "max_party_size",
            "price_label",
            "categories",
            "details",
            "how_to_claim",
            "proof_required",
            "terms_note",
            "cover_image",
            "gallery_images",
            "is_active",
            "sort_order",
            "starts_on",
            "ends_on",
        )
        read_only_fields = ("id",)

    def get_eligibility_display(self, obj: TravelOffer) -> str:
        from accounts.deal_eligibility import enriched_eligibility_display

        return enriched_eligibility_display(obj)

    def validate(self, attrs):
        min_age = attrs.get("min_age", getattr(self.instance, "min_age", None))
        max_age = attrs.get("max_age", getattr(self.instance, "max_age", None))
        min_party = attrs.get("min_party_size", getattr(self.instance, "min_party_size", None))
        max_party = attrs.get("max_party_size", getattr(self.instance, "max_party_size", None))
        if min_age is not None and max_age is not None and min_age > max_age:
            raise serializers.ValidationError({"max_age": "Max age must be on or after min age."})
        if min_party is not None and max_party is not None and min_party > max_party:
            raise serializers.ValidationError(
                {"max_party_size": "Max party size must be on or after min party size."}
            )
        return attrs

    def validate_categories(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Categories must be a list.")
        cleaned = []
        for item in value:
            s = str(item).strip().lower()
            if s and s not in cleaned:
                cleaned.append(s)
        return cleaned

    def validate_title(self, value):
        title = (value or "").strip()
        if not title:
            raise serializers.ValidationError("Title is required.")
        return title[:160]

    def validate_cover_image(self, value):
        from accounts.travel_partners import is_allowed_media_url

        src = (value or "").strip()[:2000]
        if not src:
            return ""
        if not is_allowed_media_url(src):
            raise serializers.ValidationError("Cover must be an http(s) URL or uploaded media path.")
        return src

    def validate_gallery_images(self, value):
        from accounts.travel_partners import is_allowed_media_url

        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Gallery must be a list.")
        cleaned = []
        for item in value:
            if isinstance(item, str):
                src = item.strip()
                if not src:
                    continue
                if not is_allowed_media_url(src):
                    raise serializers.ValidationError("Gallery items must be http(s) URLs or media paths.")
                cleaned.append({"src": src[:2000], "kind": "image"})
                continue
            if isinstance(item, dict):
                src = str(item.get("src") or item.get("url") or "").strip()
                if not src:
                    continue
                if not is_allowed_media_url(src):
                    raise serializers.ValidationError("Gallery items must be http(s) URLs or media paths.")
                kind = str(item.get("kind") or "image").strip().lower()
                if kind not in ("image", "video"):
                    kind = "image"
                cleaned.append({"src": src[:2000], "kind": kind})
                continue
            raise serializers.ValidationError("Gallery items must be URLs or {src, kind} objects.")
        return cleaned[:12]


class ListingSaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingSale
        fields = (
            "id",
            "vertical",
            "listing_id",
            "title",
            "badge",
            "price_label",
            "sale_price",
            "compare_at_price",
            "how_to_claim",
            "proof_required",
            "terms_note",
            "is_active",
            "starts_on",
            "ends_on",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "vertical", "listing_id", "created_at", "updated_at")

    def validate_title(self, value):
        title = (value or "").strip() or "On sale"
        return title[:160]

    def validate(self, attrs):
        sale = attrs.get("sale_price", getattr(self.instance, "sale_price", None))
        compare = attrs.get("compare_at_price", getattr(self.instance, "compare_at_price", None))
        starts = attrs.get("starts_on", getattr(self.instance, "starts_on", None))
        ends = attrs.get("ends_on", getattr(self.instance, "ends_on", None))
        if sale is not None and compare is not None and sale > compare:
            raise serializers.ValidationError(
                {"compare_at_price": "Compare-at price should be higher than the sale price."}
            )
        if starts and ends and ends < starts:
            raise serializers.ValidationError({"ends_on": "End date must be on or after the start date."})
        return attrs


class BusinessProfileSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    stats = serializers.SerializerMethodField()
    travel_offers = serializers.SerializerMethodField()

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
            "showcase_as_partner",
            "how_we_help",
            "community_impact",
            "travel_offers",
            "stats",
        )

    def get_stats(self, obj: BusinessProfile) -> dict:
        from accounts.business_listings import business_stats

        return business_stats(obj)

    def get_travel_offers(self, obj: BusinessProfile) -> list:
        from accounts.travel_partners import public_offers_qs

        offers = public_offers_qs(business=obj)
        return TravelOfferSerializer(offers, many=True).data


class MyBusinessSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    role = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    travel_offers = TravelOfferSerializer(many=True, read_only=True)

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
            "showcase_as_partner",
            "how_we_help",
            "community_impact",
            "travel_offers",
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
            "showcase_as_partner",
            "how_we_help",
            "community_impact",
        )

    def validate_business_types(self, value):
        if not value:
            raise serializers.ValidationError("Select at least one service type.")
        cleaned = list(dict.fromkeys(value))
        if len(cleaned) > 1 and BusinessType.MULTI_PROVIDER not in cleaned:
            cleaned.append(BusinessType.MULTI_PROVIDER)
        return cleaned

    def validate_how_we_help(self, value):
        return (value or "")[:4000]

    def validate_community_impact(self, value):
        return (value or "")[:4000]


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

    def validate_file(self, value):
        from accounts.verification_requirements import (
            ALLOWED_VERIFICATION_CONTENT_TYPES,
            ALLOWED_VERIFICATION_EXTENSIONS,
            MAX_VERIFICATION_FILE_BYTES,
        )

        name = (getattr(value, "name", "") or "").lower()
        ext = ""
        if "." in name:
            ext = "." + name.rsplit(".", 1)[-1]
        content_type = (getattr(value, "content_type", None) or "").lower()
        size = getattr(value, "size", None)

        if size is not None and size > MAX_VERIFICATION_FILE_BYTES:
            raise serializers.ValidationError(
                f"File is too large (max {MAX_VERIFICATION_FILE_BYTES // (1024 * 1024)} MB)."
            )
        if ext and ext not in ALLOWED_VERIFICATION_EXTENSIONS:
            raise serializers.ValidationError(
                "Upload a PDF or image (JPG, PNG, WEBP, HEIC)."
            )
        if content_type and content_type not in ALLOWED_VERIFICATION_CONTENT_TYPES:
            # Allow empty/unknown type when extension is clearly ok.
            if not ext or ext not in ALLOWED_VERIFICATION_EXTENSIONS:
                raise serializers.ValidationError(
                    "Upload a PDF or image (JPG, PNG, WEBP, HEIC)."
                )
        return value

    def create(self, validated_data):
        instance = super().create(validated_data)
        # One active file per doc type — replace older uploads on resubmit.
        older = instance.business.verification_documents.filter(doc_type=instance.doc_type).exclude(
            pk=instance.pk
        )
        for old in older:
            if old.file:
                old.file.delete(save=False)
            old.delete()
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        url = data.get("file")
        request = self.context.get("request")
        if request is not None and url and not str(url).startswith(("http://", "https://")):
            data["file"] = request.build_absolute_uri(url)
        return data


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
