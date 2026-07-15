from django.core.files.storage import default_storage
from rest_framework import serializers

from common.gallery_media import media_url_kind

from .models import FoodVenue, FoodVenueLike, FoodVenueReview, FoodVenueSave
from .review_services import user_can_review_food_venue


def _owner_display_name(user) -> str | None:
    profile = getattr(user, "profile", None)
    if profile and profile.display_name:
        return profile.display_name.strip() or None
    return None


def _absolute_media_url(url: str, request=None) -> str:
    text = (url or "").strip()
    if not text:
        return ""
    if text.startswith(("http://", "https://")):
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


def _cover_image_url(obj: FoodVenue, request=None) -> str | None:
    raw = getattr(obj, "cover_image", None)
    if raw:
        url = _absolute_media_url(str(raw), request)
        if url:
            return url
    photos = obj.photos or []
    for photo in photos:
        if isinstance(photo, dict) and photo.get("is_cover") and photo.get("image"):
            return _absolute_media_url(str(photo["image"]), request) or photo["image"]
    if photos and isinstance(photos[0], dict) and photos[0].get("image"):
        return _absolute_media_url(str(photos[0]["image"]), request) or photos[0]["image"]
    return None


def _cover_kind_for(obj: FoodVenue) -> str:
    kind = getattr(obj, "cover_kind", None)
    if kind in ("image", "video"):
        cover = (getattr(obj, "cover_image", None) or "").strip()
        if cover:
            inferred = media_url_kind(cover)
            if kind == "image" and inferred == "video":
                return "video"
            return kind
        return kind
    cover = _cover_image_url(obj)
    if cover:
        return media_url_kind(cover)
    photos = obj.photos or []
    for photo in photos:
        if isinstance(photo, dict) and photo.get("is_cover"):
            photo_kind = photo.get("kind")
            if photo_kind in ("image", "video"):
                return photo_kind
            return media_url_kind(str(photo.get("image") or ""))
    return "image"


class FoodVenueSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    owner_display_name = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    cover_kind = serializers.SerializerMethodField()
    has_reviewed = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()
    saved_by_me = serializers.SerializerMethodField()
    saves_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()

    class Meta:
        model = FoodVenue
        fields = (
            "id",
            "owner",
            "owner_username",
            "owner_display_name",
            "name",
            "description",
            "tagline",
            "popular_dish",
            "cuisine",
            "region",
            "city",
            "address",
            "latitude",
            "longitude",
            "google_place_id",
            "formatted_address",
            "phone",
            "website",
            "opening_hours",
            "opening_hours_json",
            "closes_at",
            "price_level",
            "dine_in",
            "takeaway",
            "delivery",
            "reservations",
            "is_open",
            "amenities",
            "photos",
            "venue_stories",
            "cover_image",
            "cover_kind",
            "rating_avg",
            "rating_count",
            "has_reviewed",
            "can_review",
            "saved_by_me",
            "saves_count",
            "liked_by_me",
            "likes_count",
            "is_active",
            "created_at",
        )
        read_only_fields = (
            "owner",
            "rating_avg",
            "rating_count",
            "has_reviewed",
            "can_review",
            "saved_by_me",
            "saves_count",
            "liked_by_me",
            "likes_count",
            "cover_kind",
            "created_at",
        )

    def get_owner_display_name(self, obj):
        return _owner_display_name(obj.owner)

    def get_cover_image(self, obj):
        return _cover_image_url(obj, self.context.get("request"))

    def get_cover_kind(self, obj):
        return _cover_kind_for(obj)

    def get_has_reviewed(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return FoodVenueReview.objects.filter(venue=obj, reviewer=request.user).exists()

    def get_can_review(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return user_can_review_food_venue(request.user, obj)

    def get_saved_by_me(self, obj):
        annotated = getattr(obj, "saved_by_me", None)
        if annotated is not None:
            return bool(annotated)
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return FoodVenueSave.objects.filter(venue=obj, user=request.user).exists()

    def get_saves_count(self, obj):
        annotated = getattr(obj, "saves_count", None)
        if isinstance(annotated, int):
            return annotated
        return FoodVenueSave.objects.filter(venue=obj).count()

    def get_liked_by_me(self, obj):
        annotated = getattr(obj, "liked_by_me", None)
        if annotated is not None:
            return bool(annotated)
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return FoodVenueLike.objects.filter(venue=obj, user=request.user).exists()

    def get_likes_count(self, obj):
        annotated = getattr(obj, "likes_count", None)
        if isinstance(annotated, int):
            return annotated
        return FoodVenueLike.objects.filter(venue=obj).count()

    def create(self, validated_data):
        user = self.context["request"].user
        if not hasattr(user, "profile") or user.profile.user_type != "service_provider":
            raise serializers.ValidationError("Only service providers can add venues.")
        validated_data["owner"] = user
        return super().create(validated_data)
