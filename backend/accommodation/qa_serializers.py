from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    AccommodationBooking,
    AccommodationReview,
    BookingStatus,
)
from .review_services import sync_listing_rating_from_reviews

User = get_user_model()


def _author_label(user) -> str:
    profile = getattr(user, "profile", None)
    if profile and profile.display_name:
        return profile.display_name
    return user.username


class AccommodationReviewSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    place = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = AccommodationReview
        fields = ("id", "name", "place", "rating", "body", "avatar", "created_at")
        read_only_fields = fields

    def get_name(self, obj):
        return _author_label(obj.reviewer)

    def get_place(self, obj):
        parts = [obj.listing.city, obj.listing.region]
        return ", ".join(p for p in parts if p)

    def get_avatar(self, obj):
        profile = getattr(obj.reviewer, "profile", None)
        if profile and profile.avatar:
            return profile.avatar.url if hasattr(profile.avatar, "url") else str(profile.avatar)
        return None


class AccommodationReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationReview
        fields = ("rating", "body")

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, attrs):
        booking: AccommodationBooking = self.context["booking"]
        if booking.status not in (
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.CHECKED_OUT,
        ):
            raise serializers.ValidationError(
                "You can review after your stay is confirmed or completed."
            )
        if AccommodationReview.objects.filter(booking=booking).exists():
            raise serializers.ValidationError("You already reviewed this stay.")
        return attrs

    def create(self, validated_data):
        booking = self.context["booking"]
        review = AccommodationReview.objects.create(
            listing=booking.listing,
            booking=booking,
            reviewer=self.context["request"].user,
            rating=validated_data["rating"],
            body=validated_data.get("body", "").strip(),
        )
        sync_listing_rating_from_reviews(booking.listing)
        return review
