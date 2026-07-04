from rest_framework import serializers

from .models import GuideReview
from .review_services import (
    _author_label,
    eligible_guide_booking,
    sync_guide_rating,
    user_can_review_guide,
)


class GuideReviewSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    place = serializers.SerializerMethodField()
    source = serializers.SerializerMethodField()

    class Meta:
        model = GuideReview
        fields = ("id", "name", "place", "rating", "body", "source", "created_at")
        read_only_fields = fields

    def get_name(self, obj):
        return _author_label(obj.reviewer)

    def get_place(self, obj):
        guide = obj.guide
        return ", ".join(p for p in (guide.regions or [])[:2]) or guide.headline

    def get_source(self, obj):
        return "traveler"


class GuideReviewCreateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    body = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, attrs):
        guide = self.context["guide"]
        user = self.context["request"].user
        if GuideReview.objects.filter(guide=guide, reviewer=user).exists():
            raise serializers.ValidationError("You already reviewed this guide.")
        if not eligible_guide_booking(user, guide):
            raise serializers.ValidationError(
                "You can review after a completed tour booking with this guide."
            )
        return attrs

    def create(self, validated_data):
        guide = self.context["guide"]
        user = self.context["request"].user
        booking = eligible_guide_booking(user, guide)
        review = GuideReview.objects.create(
            guide=guide,
            reviewer=user,
            booking=booking,
            rating=validated_data["rating"],
            body=validated_data.get("body", ""),
        )
        sync_guide_rating(guide)
        return review
