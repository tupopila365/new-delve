from datetime import date
from decimal import Decimal, InvalidOperation

from django.core.files.storage import default_storage
from django.db import transaction
from rest_framework import serializers

from common.story_channels import validate_story_channels
from common.coords import quantize_coord
from accounts.business_access import business_permissions, user_has_listing_manager_access
from accounts.models import BusinessProfile, VerificationStatus

from .booking_services import (
    expire_stale_booking_holds,
    find_overlapping_booking,
    host_approval_hold_deadline,
    nightly_price_breakdown,
    resolve_room_type,
)
from .models import (
    AccommodationAvailability,
    AccommodationBooking,
    AccommodationListing,
    AccommodationListingLike,
    AccommodationListingSave,
    AccommodationRoomType,
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


def _room_price(value) -> str | None:
    """Normalize a room price to a 2dp string, or None. Raises on bad input."""
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        amount = Decimal(text)
    except (InvalidOperation, ValueError):
        raise serializers.ValidationError("Room prices must be numbers.")
    if amount < 0:
        raise serializers.ValidationError("Room prices cannot be negative.")
    return f"{amount:.2f}"


def _room_uint(value) -> int | None:
    if value is None or value == "":
        return None
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise serializers.ValidationError("Room guest/bedroom counts must be whole numbers.")
    return max(0, number)


def _room_str_list(value) -> list[str]:
    if not isinstance(value, (list, tuple)):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def normalize_room_type(row) -> dict:
    """Coerce a freeform room_types entry into the documented, first-class shape.

    Accepts legacy aliases (was_price/original_price, special_label, is_featured,
    photo, gallery/photos) and returns canonical keys the frontend reads.
    """
    if not isinstance(row, dict):
        raise serializers.ValidationError("Each room type must be an object.")
    name = str(row.get("name", "")).strip()
    if not name:
        raise serializers.ValidationError("Each room type needs a name.")

    image = str(row.get("image") or row.get("photo") or "").strip()
    images = _room_str_list(row.get("images") or row.get("gallery") or row.get("photos"))
    if not images and image:
        images = [image]

    price = _room_price(row.get("price_per_night"))
    compare_at = _room_price(
        row.get("compare_at_price") or row.get("was_price") or row.get("original_price")
    )
    # A "was" price is only a real discount when it exceeds the current price.
    if price is not None and compare_at is not None and Decimal(compare_at) <= Decimal(price):
        compare_at = None

    badge = str(row.get("badge") or row.get("special_label") or "").strip() or None
    badges: list[str] = []
    raw_badges = row.get("badges")
    if isinstance(raw_badges, (list, tuple)):
        for item in raw_badges:
            text = str(item or "").strip()[:40]
            if text and text.lower() not in {b.lower() for b in badges}:
                badges.append(text)
            if len(badges) >= 8:
                break
    if not badges and badge:
        badges = [badge]
    badge = badges[0] if badges else None

    return {
        "name": name,
        "description": str(row.get("description") or "").strip(),
        "max_guests": _room_uint(row.get("max_guests")),
        "bedrooms": _room_uint(row.get("bedrooms")),
        "bed_summary": str(row.get("bed_summary") or "").strip(),
        "price_per_night": price,
        "compare_at_price": compare_at,
        "badges": badges,
        "badge": badge,
        "featured": bool(row.get("featured") or row.get("is_featured")),
        "image": image or None,
        "images": images,
    }


class AccommodationRoomTypeSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    price_per_night = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = AccommodationRoomType
        fields = (
            "id",
            "name",
            "description",
            "quantity_available",
            "max_guests",
            "bedrooms",
            "bed_summary",
            "price_per_night",
            "compare_at_price",
            "badges",
            "featured",
            "image",
            "images",
            "is_active",
            "sort_order",
        )
        extra_kwargs = {
            "quantity_available": {"min_value": 1},
            "max_guests": {"min_value": 1},
            "bedrooms": {"min_value": 0},
            "image": {"allow_blank": True, "required": False},
            "badges": {"required": False},
            "images": {"required": False},
            "is_active": {"required": False},
            "sort_order": {"required": False},
        }

    def validate(self, attrs):
        price = attrs.get("price_per_night")
        compare_at = attrs.get("compare_at_price")
        if price is not None and compare_at is not None and compare_at <= price:
            attrs["compare_at_price"] = None
        badges = attrs.get("badges")
        if badges is not None:
            attrs["badges"] = _room_str_list(badges)[:8]
        images = attrs.get("images")
        if images is not None:
            attrs["images"] = _room_str_list(images)
        return attrs


class AccommodationAvailabilitySerializer(serializers.ModelSerializer):
    room_type_name = serializers.CharField(source="room_type.name", read_only=True)

    class Meta:
        model = AccommodationAvailability
        fields = (
            "id",
            "listing",
            "room_type",
            "room_type_name",
            "date",
            "is_available",
            "quantity_available",
            "price_override",
            "note",
        )
        read_only_fields = ("id", "listing", "room_type_name")
        extra_kwargs = {
            "quantity_available": {"min_value": 0},
        }


class AccommodationListingSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    owner_display_name = serializers.SerializerMethodField()
    owner_avatar = serializers.SerializerMethodField()
    owner_verified = serializers.SerializerMethodField()
    cover_image = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    likes_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    saves_count = serializers.SerializerMethodField()
    saved_by_me = serializers.SerializerMethodField()
    deals = serializers.SerializerMethodField()
    business_name = serializers.CharField(source="business.business_name", read_only=True)
    verification_status = serializers.SerializerMethodField()
    publication_status = serializers.SerializerMethodField()
    publication_status_label = serializers.SerializerMethodField()
    room_types = AccommodationRoomTypeSerializer(
        source="room_type_records",
        many=True,
        required=False,
    )

    class Meta:
        model = AccommodationListing
        fields = (
            "id",
            "owner",
            "business",
            "business_name",
            "verification_status",
            "publication_status",
            "publication_status_label",
            "owner_username",
            "owner_display_name",
            "owner_avatar",
            "owner_verified",
            "title",
            "description",
            "property_type",
            "pet_friendly",
            "wifi",
            "parking",
            "pool",
            "kitchen",
            "breakfast",
            "country_code",
            "region",
            "city",
            "address",
            "latitude",
            "longitude",
            "google_place_id",
            "formatted_address",
            "price_per_night",
            "max_guests",
            "bedrooms",
            "amenities",
            "niche_tags",
            "cover_image",
            "media_gallery",
            "listing_stories",
            "check_in_from",
            "check_out_until",
            "house_rules",
            "cancellation_policy",
            "faqs",
            "guest_reviews",
            "room_types",
            "rating_avg",
            "rating_count",
            "views_count",
            "is_active",
            "created_at",
            "likes_count",
            "liked_by_me",
            "saves_count",
            "saved_by_me",
            "deals",
        )
        read_only_fields = (
            "owner",
            "business_name",
            "verification_status",
            "publication_status",
            "publication_status_label",
            "created_at",
            "views_count",
            "likes_count",
            "liked_by_me",
            "saves_count",
            "saved_by_me",
            "deals",
            "owner_display_name",
            "owner_avatar",
            "owner_verified",
        )

    def get_owner_display_name(self, obj):
        return _owner_display_name(obj.owner)

    def get_deals(self, obj):
        from accounts.listing_deals import deals_for_listing

        return deals_for_listing(obj, self.context, "stays")

    def get_owner_avatar(self, obj):
        return _owner_avatar_url(obj.owner, self.context.get("request"))

    def _verification_status(self, obj):
        business = getattr(obj, "business", None)
        if business is not None:
            return business.verification_status
        fallback = (
            BusinessProfile.objects.filter(owner_id=obj.owner_id)
            .order_by("-updated_at", "-id")
            .first()
        )
        return (
            fallback.verification_status
            if fallback is not None
            else VerificationStatus.UNVERIFIED
        )

    def get_verification_status(self, obj):
        return self._verification_status(obj)

    def get_publication_status(self, obj):
        # Legacy listings without a BusinessProfile remain publishable. Migration
        # 0027 attaches every listing whose owner already has a business.
        if obj.business_id is None:
            return "live" if obj.is_active else "draft"
        verification = self._verification_status(obj)
        if verification == VerificationStatus.SUSPENDED:
            return "suspended"
        if obj.is_active and verification == VerificationStatus.VERIFIED:
            return "live"
        if verification == VerificationStatus.PENDING:
            return "pending_verification"
        return "draft"

    def get_publication_status_label(self, obj):
        return {
            "draft": "Draft",
            "pending_verification": "Pending verification",
            "live": "Live",
            "suspended": "Suspended",
        }[self.get_publication_status(obj)]

    def get_owner_verified(self, obj):
        annotated = getattr(obj, "owner_verified", None)
        if annotated is not None:
            return bool(annotated)
        from accounts.seller_trust import owner_is_business_verified

        return owner_is_business_verified(getattr(obj, "owner_id", None))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        cover = _listing_cover_url(instance, request)
        data["cover_image"] = cover
        if request and "/provider-listings/" not in request.path:
            data["room_types"] = [
                room for room in data.get("room_types", []) if room.get("is_active", True)
            ]
        return data

    def to_internal_value(self, data):
        # Quantize before DecimalField rejects Google float precision.
        if hasattr(data, "copy"):
            data = data.copy()
        elif isinstance(data, dict):
            data = dict(data)
        else:
            return super().to_internal_value(data)
        for key in ("latitude", "longitude"):
            if key in data and data[key] not in (None, ""):
                try:
                    q = quantize_coord(data[key])
                    data[key] = None if q is None else format(q, "f")
                except ValueError:
                    pass
        return super().to_internal_value(data)

    def validate_cover_image(self, value):
        if value is None:
            return ""
        return str(value).strip()

    def validate_house_rules(self, value):
        if value in (None, ""):
            return []
        if isinstance(value, str):
            # Legacy clients may still send newline-joined text.
            return [line.strip() for line in value.splitlines() if line.strip()][:40]
        if not isinstance(value, list):
            raise serializers.ValidationError("house_rules must be a list of strings.")
        out: list[str] = []
        for item in value:
            text = str(item or "").strip()
            if text:
                out.append(text[:160])
            if len(out) >= 40:
                break
        return out

    def validate_business(self, business):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Sign in to select a business.")
        if not business_permissions(request.user, business)["manage_listings"]:
            raise serializers.ValidationError("You cannot manage properties for this business.")
        return business

    def validate_listing_stories(self, value):
        return validate_story_channels(value, field_label="Host Highlights")

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
        if not user_has_listing_manager_access(user):
            raise serializers.ValidationError("Only service providers can create listings.")
        rooms_data = validated_data.pop("room_type_records", None)
        business = validated_data.get("business")
        if business is None:
            owned = list(BusinessProfile.objects.filter(owner=user).order_by("id"))
            business = next(
                (row for row in owned if "accommodation" in (row.business_types or [])),
                owned[0] if owned else None,
            )
            if business:
                validated_data["business"] = business
        from accounts.seller_trust import enforce_service_go_live

        owner = business.owner if business else user
        enforce_service_go_live(
            user=owner,
            wanting_active=bool(validated_data.get("is_active", True)),
        )
        validated_data["owner"] = owner
        if validated_data.get("cover_image") is None:
            validated_data["cover_image"] = ""
        listing = super().create(validated_data)
        if rooms_data is not None:
            self._sync_room_types(listing, rooms_data)
        return listing

    def update(self, instance, validated_data):
        rooms_data = validated_data.pop("room_type_records", None)
        if "cover_image" in validated_data and validated_data["cover_image"] is None:
            validated_data["cover_image"] = ""
        if "is_active" in validated_data:
            from accounts.seller_trust import enforce_service_go_live

            enforce_service_go_live(
                user=instance.owner,
                wanting_active=bool(validated_data.get("is_active")),
            )
        listing = super().update(instance, validated_data)
        if rooms_data is not None:
            self._sync_room_types(listing, rooms_data)
        return listing

    def _sync_room_types(self, listing, rooms_data):
        """Compatibility path for older clients that still submit nested room_types."""
        existing = {room.id: room for room in listing.room_type_records.all()}
        kept_ids: set[int] = set()
        for index, raw in enumerate(rooms_data):
            data = dict(raw)
            room_id = data.pop("id", None)
            room = existing.get(room_id) if room_id else None
            if room_id and room is None:
                raise serializers.ValidationError(
                    {"room_types": f"Room type {room_id} does not belong to this property."}
                )
            if data.get("price_per_night") is None:
                data["price_per_night"] = listing.price_per_night
            data.setdefault("sort_order", index)
            if room is None:
                room = AccommodationRoomType.objects.create(listing=listing, **data)
            else:
                for field, value in data.items():
                    setattr(room, field, value)
                room.save()
            kept_ids.add(room.id)

        for room in listing.room_type_records.exclude(id__in=kept_ids):
            if room.bookings.exists():
                room.is_active = False
                room.save(update_fields=["is_active", "updated_at"])
            else:
                room.delete()


class AccommodationBookingSerializer(serializers.ModelSerializer):
    listing_title = serializers.SerializerMethodField()
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
            "platform_fee",
            "seller_payout",
            "payout_status",
            "paid_at",
            "payout_released_at",
            "special_requests",
            "room_type",
            "room_type_name",
            "listing_title_snapshot",
            "room_snapshot",
            "nightly_price_snapshot",
            "hold_expires_at",
            "expired_at",
            "status",
            "mock_payment_ref",
            "has_review",
            "created_at",
        )
        read_only_fields = (
            "guest",
            "total_price",
            "platform_fee",
            "seller_payout",
            "payout_status",
            "paid_at",
            "payout_released_at",
            "status",
            "mock_payment_ref",
            "listing_title_snapshot",
            "room_snapshot",
            "nightly_price_snapshot",
            "hold_expires_at",
            "expired_at",
            "has_review",
            "created_at",
        )

    def get_has_review(self, obj):
        if hasattr(obj, "review"):
            try:
                return obj.review is not None
            except AccommodationReview.DoesNotExist:
                pass
        return AccommodationReview.objects.filter(booking_id=obj.pk).exists()

    def get_listing_title(self, obj):
        return obj.listing_title_snapshot or obj.listing.title

    def validate(self, attrs):
        listing = attrs["listing"]
        check_in = attrs["check_in"]
        check_out = attrs["check_out"]
        guests = attrs.get("guests", 1)
        room_type = attrs.get("room_type")
        room_type_name = (attrs.get("room_type_name") or "").strip()
        if room_type is not None and room_type.listing_id != listing.id:
            raise serializers.ValidationError(
                {"room_type": "This room type does not belong to the selected property."}
            )
        if room_type is not None and not room_type.is_active:
            raise serializers.ValidationError({"room_type": "This room type is not bookable."})
        if room_type is None and room_type_name:
            room_type = resolve_room_type(listing, room_type_name=room_type_name)
            if room_type is None:
                raise serializers.ValidationError(
                    {"room_type_name": "Use the room type ID; this room name is missing or ambiguous."}
                )
            attrs["room_type"] = room_type
        if check_out <= check_in:
            raise serializers.ValidationError("check_out must be after check_in.")
        max_guests_allowed = listing.max_guests
        if room_type is not None:
            max_guests_allowed = min(max_guests_allowed, room_type.max_guests)
            attrs["room_type_name"] = room_type.name
        elif listing.room_type_records.filter(is_active=True).exists():
            raise serializers.ValidationError({"room_type": "Select a room type."})
        if guests > max_guests_allowed:
            raise serializers.ValidationError("Too many guests for this listing.")
        conflict = find_overlapping_booking(
            listing,
            check_in,
            check_out,
            room_type=room_type,
        )
        if conflict:
            raise serializers.ValidationError(
                "Those dates are no longer available. Please choose different dates."
            )
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        if not request.user.profile.email_verified:
            raise serializers.ValidationError("Verify your email before booking.")
        with transaction.atomic():
            listing = AccommodationListing.objects.select_for_update().get(
                pk=validated_data["listing"].pk
            )
            if not listing.is_active:
                raise serializers.ValidationError("This property is not accepting bookings.")
            validated_data["listing"] = listing
            expire_stale_booking_holds(
                queryset=AccommodationBooking.objects.filter(listing=listing)
            )
            check_in: date = validated_data["check_in"]
            check_out: date = validated_data["check_out"]
            room_type = validated_data.get("room_type")
            if room_type is not None:
                room_type = AccommodationRoomType.objects.select_for_update().get(pk=room_type.pk)
                if room_type.listing_id != listing.id or not room_type.is_active:
                    raise serializers.ValidationError(
                        {"room_type": "This room type is no longer bookable."}
                    )
                validated_data["room_type"] = room_type
            conflict = find_overlapping_booking(
                listing,
                check_in,
                check_out,
                room_type=room_type,
            )
            if conflict:
                raise serializers.ValidationError(
                    "Those dates are no longer available. Please choose different dates."
                )

            nightly_prices = nightly_price_breakdown(
                listing,
                check_in,
                check_out,
                room_type=room_type,
            )
            total = sum(
                (Decimal(row["price"]) for row in nightly_prices),
                Decimal("0"),
            )
            validated_data["guest"] = request.user
            validated_data["total_price"] = total
            validated_data["status"] = BookingStatus.PENDING
            validated_data["room_type_name"] = room_type.name if room_type else ""
            validated_data["listing_title_snapshot"] = listing.title
            validated_data["room_snapshot"] = (
                {
                    "id": room_type.id,
                    "name": room_type.name,
                    "max_guests": room_type.max_guests,
                    "bedrooms": room_type.bedrooms,
                    "bed_summary": room_type.bed_summary,
                    "quantity_available": room_type.quantity_available,
                    "price_per_night": f"{room_type.price_per_night:.2f}",
                }
                if room_type
                else {
                    "id": None,
                    "name": "",
                    "max_guests": listing.max_guests,
                    "bedrooms": listing.bedrooms,
                    "price_per_night": f"{listing.price_per_night:.2f}",
                }
            )
            validated_data["nightly_price_snapshot"] = nightly_prices
            validated_data["hold_expires_at"] = host_approval_hold_deadline()
            return super().create(validated_data)


class ProviderAccommodationBookingSerializer(serializers.ModelSerializer):
    listing_title = serializers.SerializerMethodField()
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
            "platform_fee",
            "seller_payout",
            "payout_status",
            "paid_at",
            "payout_released_at",
            "special_requests",
            "room_type",
            "room_type_name",
            "listing_title_snapshot",
            "room_snapshot",
            "nightly_price_snapshot",
            "hold_expires_at",
            "expired_at",
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
            "platform_fee",
            "seller_payout",
            "payout_status",
            "paid_at",
            "payout_released_at",
            "special_requests",
            "room_type",
            "room_type_name",
            "listing_title_snapshot",
            "room_snapshot",
            "nightly_price_snapshot",
            "hold_expires_at",
            "expired_at",
            "mock_payment_ref",
            "created_at",
        )

    def get_guest_display_name(self, obj):
        profile = getattr(obj.guest, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return obj.guest.username

    def get_listing_title(self, obj):
        return obj.listing_title_snapshot or obj.listing.title


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
    BookingStatus.EXPIRED: set(),
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
