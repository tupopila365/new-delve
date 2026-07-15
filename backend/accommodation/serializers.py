from datetime import date
from decimal import Decimal

from django.core.files.storage import default_storage
from rest_framework import serializers

from .booking_services import (
    find_overlapping_booking,
    normalize_room_type_name,
)
from .models import (
    AccommodationBooking,
    AccommodationListing,
    AccommodationListingLike,
    AccommodationListingSave,
    AccommodationReview,
    BookingStatus,
)


def _owner_display_name(user) -> str | None:
    profile = getattr(user, "profile", None)
    if profile and getattr(profile, "display_name", None):
        name = (profile.display_name or "").strip()
        return name or None
    return None


def _owner_avatar_url(user, request=None) -> str | None:
    profile = getattr(user, "profile", None)
    avatar = getattr(profile, "avatar", None) if profile else None
    if not avatar:
        return None
    try:
        url = avatar.url
    except Exception:
        return None
    if request and url.startswith("/"):
        return request.build_absolute_uri(url)
    return url


def _absolute_media_url(url: str, request=None) -> str:
    text = (url or "").strip()
    if not text:
        return ""
    if text.startswith(("http://", "https://", "data:", "blob:")):
        return text
    if text.startswith("/") and request:
        return request.build_absolute_uri(text)
    try:
        storage_url = default_storage.url(text)
    except Exception:
        storage_url = text if text.startswith("/") else f"/media/{text.lstrip('/')}"
    if request and storage_url.startswith("/"):
        return request.build_absolute_uri(storage_url)
    return storage_url


def _listing_cover_url(obj: AccommodationListing, request=None) -> str | None:
    raw = (getattr(obj, "cover_image", None) or "").strip()
    if raw:
        url = _absolute_media_url(raw, request)
        if url:
            return url
    for item in obj.media_gallery or []:
        if not isinstance(item, dict):
            continue
        src = str(item.get("src") or "").strip()
        if src:
            return _absolute_media_url(src, request) or src
    return None


class AccommodationListingSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    owner_display_name = serializers.SerializerMethodField()
    owner_avatar = serializers.SerializerMethodField()
    cover_image = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    likes_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    saves_count = serializers.SerializerMethodField()
    saved_by_me = serializers.SerializerMethodField()

    class Meta:
        model = AccommodationListing
        fields = (
            "id",
            "owner",
            "owner_username",
            "owner_display_name",
            "owner_avatar",
            "title",
            "description",
            "property_type",
            "pet_friendly",
            "wifi",
            "parking",
            "pool",
            "kitchen",
            "breakfast",
            "region",
            "city",
            "price_per_night",
            "max_guests",
            "bedrooms",
            "amenities",
            "cover_image",
            "media_gallery",
            "check_in_from",
            "check_out_until",
            "house_rules",
            "cancellation_policy",
            "faqs",
            "guest_reviews",
            "room_types",
            "rating_avg",
            "rating_count",
            "is_active",
            "created_at",
            "likes_count",
            "liked_by_me",
            "saves_count",
            "saved_by_me",
        )
        read_only_fields = (
            "owner",
            "created_at",
            "likes_count",
            "liked_by_me",
            "saves_count",
            "saved_by_me",
            "owner_display_name",
            "owner_avatar",
        )

    def get_owner_display_name(self, obj):
        return _owner_display_name(obj.owner)

    def get_owner_avatar(self, obj):
        return _owner_avatar_url(obj.owner, self.context.get("request"))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        cover = _listing_cover_url(instance, request)
        data["cover_image"] = cover
        return data

    def validate_cover_image(self, value):
        if value is None:
            return ""
        return str(value).strip()

    def get_likes_count(self, obj):
        v = getattr(obj, "likes_count", None)
        if v is not None:
            return int(v)
        return AccommodationListingLike.objects.filter(listing_id=obj.pk).count()

    def get_liked_by_me(self, obj):
        v = getattr(obj, "liked_by_me", None)
        if v is not None:
            return bool(v)
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return AccommodationListingLike.objects.filter(listing_id=obj.pk, user=request.user).exists()

    def get_saves_count(self, obj):
        v = getattr(obj, "saves_count", None)
        if v is not None:
            return int(v)
        return AccommodationListingSave.objects.filter(listing_id=obj.pk).count()

    def get_saved_by_me(self, obj):
        v = getattr(obj, "saved_by_me", None)
        if v is not None:
            return bool(v)
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return AccommodationListingSave.objects.filter(listing_id=obj.pk, user=request.user).exists()

    def create(self, validated_data):
        user = self.context["request"].user
        if not hasattr(user, "profile") or user.profile.user_type != "service_provider":
            raise serializers.ValidationError("Only service providers can create listings.")
        validated_data["owner"] = user
        if validated_data.get("cover_image") is None:
            validated_data["cover_image"] = ""
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "cover_image" in validated_data and validated_data["cover_image"] is None:
            validated_data["cover_image"] = ""
        return super().update(instance, validated_data)


class AccommodationBookingSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    listing_owner_username = serializers.CharField(source="listing.owner.username", read_only=True)
    has_review = serializers.SerializerMethodField()

    class Meta:
        model = AccommodationBooking
        fields = (
            "id",
            "listing",
            "listing_title",
            "listing_owner_username",
            "guest",
            "check_in",
            "check_out",
            "guests",
            "total_price",
            "special_requests",
            "room_type_name",
            "status",
            "mock_payment_ref",
            "has_review",
            "created_at",
        )
        read_only_fields = ("guest", "total_price", "status", "mock_payment_ref", "has_review", "created_at")

    def get_has_review(self, obj):
        if hasattr(obj, "review"):
            try:
                return obj.review is not None
            except AccommodationReview.DoesNotExist:
                pass
        return AccommodationReview.objects.filter(booking_id=obj.pk).exists()

    def validate(self, attrs):
        listing = attrs["listing"]
        check_in = attrs["check_in"]
        check_out = attrs["check_out"]
        guests = attrs.get("guests", 1)
        room_type_name = (attrs.get("room_type_name") or "").strip()
        if check_out <= check_in:
            raise serializers.ValidationError("check_out must be after check_in.")
        max_guests_allowed = listing.max_guests
        if room_type_name:
            found = False
            for row in listing.room_types or []:
                if not isinstance(row, dict):
                    continue
                name = str(row.get("name", "")).strip()
                if name != room_type_name:
                    continue
                found = True
                mg = row.get("max_guests")
                if mg is not None:
                    try:
                        max_guests_allowed = min(max_guests_allowed, int(mg))
                    except (TypeError, ValueError):
                        pass
                break
            if not found:
                raise serializers.ValidationError(
                    {"room_type_name": "Unknown room type for this listing."}
                )
        if guests > max_guests_allowed:
            raise serializers.ValidationError("Too many guests for this listing.")
        room_key = normalize_room_type_name(room_type_name)
        conflict = find_overlapping_booking(listing, check_in, check_out, room_type_name=room_key)
        if conflict:
            raise serializers.ValidationError(
                "Those dates are no longer available. Please choose different dates."
            )
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        if not request.user.profile.email_verified:
            raise serializers.ValidationError("Verify your email before booking.")
        listing = validated_data["listing"]
        check_in: date = validated_data["check_in"]
        check_out: date = validated_data["check_out"]
        nights = (check_out - check_in).days
        if nights < 1:
            nights = 1
        nightly = listing.price_per_night
        room_type_name = (validated_data.get("room_type_name") or "").strip()
        if room_type_name:
            for row in listing.room_types or []:
                if not isinstance(row, dict):
                    continue
                if str(row.get("name", "")).strip() != room_type_name:
                    continue
                p = row.get("price_per_night")
                if p is not None and str(p).strip() != "":
                    nightly = Decimal(str(p))
                break
        total = nightly * nights
        validated_data["guest"] = request.user
        validated_data["total_price"] = total
        validated_data["status"] = BookingStatus.PENDING
        if "room_type_name" in validated_data and not validated_data["room_type_name"]:
            validated_data["room_type_name"] = ""
        return super().create(validated_data)


class ProviderAccommodationBookingSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    guest_username = serializers.CharField(source="guest.username", read_only=True)
    guest_display_name = serializers.SerializerMethodField()

    class Meta:
        model = AccommodationBooking
        fields = (
            "id",
            "listing",
            "listing_title",
            "guest",
            "guest_username",
            "guest_display_name",
            "check_in",
            "check_out",
            "guests",
            "total_price",
            "special_requests",
            "room_type_name",
            "status",
            "mock_payment_ref",
            "created_at",
        )
        read_only_fields = (
            "listing",
            "guest",
            "check_in",
            "check_out",
            "guests",
            "total_price",
            "special_requests",
            "room_type_name",
            "mock_payment_ref",
            "created_at",
        )

    def get_guest_display_name(self, obj):
        profile = getattr(obj.guest, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return obj.guest.username


PROVIDER_STATUS_TRANSITIONS: dict[str, set[str]] = {
    BookingStatus.PENDING: {BookingStatus.CONFIRMED, BookingStatus.CANCELLED},
    BookingStatus.CONFIRMED: {
        BookingStatus.CHECKED_IN,
        BookingStatus.CANCELLED,
        BookingStatus.REFUNDED,
    },
    BookingStatus.CHECKED_IN: {BookingStatus.CHECKED_OUT},
    BookingStatus.CHECKED_OUT: set(),
    BookingStatus.CANCELLED: {BookingStatus.REFUNDED},
    BookingStatus.REFUNDED: set(),
}


class ProviderBookingStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=BookingStatus.choices)

    def validate_status(self, value):
        booking = self.context["booking"]
        allowed = PROVIDER_STATUS_TRANSITIONS.get(booking.status, set())
        if value not in allowed:
            raise serializers.ValidationError(
                f"Cannot change status from {booking.status} to {value}."
            )
        return value
