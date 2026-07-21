from rest_framework import serializers

from .models import ActivityReview
from .review_services import (
    normalize_review_media,
    sync_activity_rating,
    user_can_review_activity,
    _author_label,
    _reviewer_avatar,
)

MAX_REVIEW_MEDIA = 8


class ReviewMediaItemSerializer(serializers.Serializer):
    url = serializers.CharField(max_length=1000)
    kind = serializers.ChoiceField(choices=("image", "video"), default="image")


class ActivityReviewCreateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    body = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    media = ReviewMediaItemSerializer(many=True, required=False)

    def validate_media(self, value):
        if value and len(value) > MAX_REVIEW_MEDIA:
            raise serializers.ValidationError(
                f"You can attach up to {MAX_REVIEW_MEDIA} photos or videos."
            )
        cleaned = []
        for item in value or []:
            url = (item.get("url") or "").strip()
            if not url:
                continue
            cleaned.append({"url": url, "kind": item.get("kind", "image")})
        return cleaned

    def validate(self, attrs):
        listing = self.context["listing"]
        user = self.context["request"].user
        if not user_can_review_activity(user, listing):
            if listing.owner_id == user.id:
                raise serializers.ValidationError("You cannot review your own activity.")
            if ActivityReview.objects.filter(listing=listing, reviewer=user).exists():
                raise serializers.ValidationError("You already reviewed this activity.")
            raise serializers.ValidationError("You cannot review this activity.")
        return attrs

    def create(self, validated_data):
        listing = self.context["listing"]
        user = self.context["request"].user
        review = ActivityReview.objects.create(
            listing=listing,
            reviewer=user,
            rating=validated_data["rating"],
            body=validated_data.get("body", ""),
            media=validated_data.get("media", []),
        )
        sync_activity_rating(listing)
        return review


class ActivityReviewSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()
    verified_experience = serializers.SerializerMethodField()

    class Meta:
        model = ActivityReview
        fields = (
            "id",
            "name",
            "avatar",
            "rating",
            "body",
            "seller_reply",
            "seller_replied_at",
            "media",
            "verified_experience",
            "created_at",
        )
        read_only_fields = fields

    def _request(self):
        return self.context.get("request")

    def get_name(self, obj):
        return _author_label(obj.reviewer)

    def get_avatar(self, obj):
        return _reviewer_avatar(obj.reviewer, self._request())

    def get_media(self, obj):
        return normalize_review_media(obj.media, self._request())

    def get_verified_experience(self, obj):
        return False
