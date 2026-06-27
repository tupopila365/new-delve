from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .access import user_can_manage_event
from .models import EventAnswer, EventQuestion, EventReview, EventBooking, EventBookingStatus

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


class EventAnswerSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    ago = serializers.SerializerMethodField()

    class Meta:
        model = EventAnswer
        fields = ("id", "author", "body", "is_official", "ago", "created_at")
        read_only_fields = ("author", "is_official", "created_at")

    def get_author(self, obj):
        return _author_label(obj.author)

    def get_ago(self, obj):
        return _time_ago(obj.created_at)


class EventQuestionSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    ago = serializers.SerializerMethodField()
    answers = EventAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = EventQuestion
        fields = ("id", "author", "body", "ago", "answers", "created_at")
        read_only_fields = ("author", "created_at")

    def get_author(self, obj):
        return _author_label(obj.author)

    def get_ago(self, obj):
        return _time_ago(obj.created_at)


class EventQuestionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventQuestion
        fields = ("body",)

    def create(self, validated_data):
        return EventQuestion.objects.create(
            event=self.context["event"],
            author=self.context["request"].user,
            body=validated_data["body"].strip(),
        )


class EventAnswerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventAnswer
        fields = ("body",)

    def create(self, validated_data):
        question = self.context["question"]
        user = self.context["request"].user
        is_official = user_can_manage_event(user, question.event)
        return EventAnswer.objects.create(
            question=question,
            author=user,
            body=validated_data["body"].strip(),
            is_official=is_official,
        )


class EventReviewSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    place = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = EventReview
        fields = ("id", "name", "place", "rating", "body", "avatar", "created_at")
        read_only_fields = fields

    def get_name(self, obj):
        return _author_label(obj.reviewer)

    def get_place(self, obj):
        parts = [obj.event.city, obj.event.region]
        return ", ".join(p for p in parts if p)

    def get_avatar(self, obj):
        profile = getattr(obj.reviewer, "profile", None)
        if profile and profile.avatar:
            return profile.avatar.url if hasattr(profile.avatar, "url") else str(profile.avatar)
        return None


class EventReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventReview
        fields = ("rating", "body")

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, attrs):
        booking: EventBooking = self.context["booking"]
        if booking.status != EventBookingStatus.CHECKED_IN:
            raise serializers.ValidationError("You can review after checking in at the event.")
        if EventReview.objects.filter(booking=booking).exists():
            raise serializers.ValidationError("You already reviewed this event.")
        return attrs

    def create(self, validated_data):
        booking = self.context["booking"]
        return EventReview.objects.create(
            event=booking.event,
            booking=booking,
            reviewer=self.context["request"].user,
            rating=validated_data["rating"],
            body=validated_data.get("body", "").strip(),
        )
