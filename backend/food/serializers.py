from rest_framework import serializers

from .models import FoodVenue, FoodVenueReview, FoodVenueSave
from .review_services import user_can_review_food_venue


def _owner_display_name(user) -> str | None:
    profile = getattr(user, "profile", None)
    if profile and profile.display_name:
        return profile.display_name.strip() or None
    return None


def _cover_image_url(obj: FoodVenue, request=None) -> str | None:
    if obj.cover_image:
        url = obj.cover_image.url
        if request:
            return request.build_absolute_uri(url)
        return url
    photos = obj.photos or []
    for photo in photos:
        if isinstance(photo, dict) and photo.get("is_cover") and photo.get("image"):
            return photo["image"]
    if photos and isinstance(photos[0], dict) and photos[0].get("image"):
        return photos[0]["image"]
    return None


class FoodVenueSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    owner_display_name = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    has_reviewed = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()
    saved_by_me = serializers.SerializerMethodField()
    saves_count = serializers.SerializerMethodField()

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
            "phone",
            "website",
            "opening_hours",
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
            "rating_avg",
            "rating_count",
            "has_reviewed",
            "can_review",
            "saved_by_me",
            "saves_count",
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
            "created_at",
        )

    def get_owner_display_name(self, obj):
        return _owner_display_name(obj.owner)

    def get_cover_image(self, obj):
        return _cover_image_url(obj, self.context.get("request"))

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
        return FoodVenueSave.objects.filter(venue=obj).count()

    def create(self, validated_data):
        user = self.context["request"].user
        if not hasattr(user, "profile") or user.profile.user_type != "service_provider":
            raise serializers.ValidationError("Only service providers can add venues.")
        validated_data["owner"] = user
        return super().create(validated_data)
