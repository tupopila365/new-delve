from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from accounts.business_access import user_can_manage_listing

from .models import (
    AccommodationAnswer,
    AccommodationBooking,
    AccommodationQuestion,
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


def _time_ago(dt) -> str:
    if not dt:
        return ""
    delta = timezone.now() - dt
    mins = int(delta.total_seconds() // 60)
    if mins < 1:
        return "Just now"
    if mins < 60:
        return f"{mins}m ago"
    hours = mins // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    if days < 7:
        return f"{days}d ago"
    return dt.strftime("%b %d")


class AccommodationAnswerSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    ago = serializers.SerializerMethodField()

    class Meta:
        model = AccommodationAnswer
        fields = ("id", "author", "body", "is_official", "ago", "created_at")
        read_only_fields = ("author", "is_official", "created_at")

    def get_author(self, obj):
        return _author_label(obj.author)

    def get_ago(self, obj):
        return _time_ago(obj.created_at)


class AccommodationQuestionSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    ago = serializers.SerializerMethodField()
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    answers = AccommodationAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = AccommodationQuestion
        fields = ("id", "listing", "listing_title", "author", "body", "ago", "answers", "created_at")
        read_only_fields = ("author", "created_at")

    def get_author(self, obj):
        return _author_label(obj.author)

    def get_ago(self, obj):
        return _time_ago(obj.created_at)


class AccommodationQuestionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationQuestion
        fields = ("body",)

    def create(self, validated_data):
        return AccommodationQuestion.objects.create(
            listing=self.context["listing"],
            author=self.context["request"].user,
            body=validated_data["body"].strip(),
        )


class AccommodationAnswerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationAnswer
        fields = ("body",)

    def create(self, validated_data):
        question = self.context["question"]
        user = self.context["request"].user
        is_official = user_can_manage_listing(user, question.listing.owner_id)
        return AccommodationAnswer.objects.create(
            question=question,
            author=user,
            body=validated_data["body"].strip(),
            is_official=is_official,
        )


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
