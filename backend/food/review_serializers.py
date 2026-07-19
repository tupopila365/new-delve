from rest_framework import serializers

from .models import FoodVenueReview
from .review_services import (
    _author_label,
    eligible_food_reservation,
    sync_food_venue_rating,
    user_can_review_food_venue,
)


class FoodVenueReviewSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    place = serializers.SerializerMethodField()
    source = serializers.SerializerMethodField()

    class Meta:
        model = FoodVenueReview
        fields = ("id", "name", "place", "rating", "body", "seller_reply", "seller_replied_at", "source", "created_at")
        read_only_fields = fields

    def get_name(self, obj):
        return _author_label(obj.reviewer)

    def get_place(self, obj):
        venue = obj.venue
        return ", ".join(p for p in [venue.city, venue.region] if p) or venue.name

    def get_source(self, obj):
        return "traveler"


class FoodVenueReviewCreateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    body = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, attrs):
        venue = self.context["venue"]
        user = self.context["request"].user
        if FoodVenueReview.objects.filter(venue=venue, reviewer=user).exists():
            raise serializers.ValidationError("You already reviewed this venue.")
        if not eligible_food_reservation(user, venue):
            raise serializers.ValidationError(
                "You can review after your table reservation is marked seated or completed."
            )
        return attrs

    def create(self, validated_data):
        venue = self.context["venue"]
        user = self.context["request"].user
        reservation = eligible_food_reservation(user, venue)
        review = FoodVenueReview.objects.create(
            venue=venue,
            reviewer=user,
            reservation=reservation,
            rating=validated_data["rating"],
            body=validated_data.get("body", ""),
        )
        sync_food_venue_rating(venue)
        return review
