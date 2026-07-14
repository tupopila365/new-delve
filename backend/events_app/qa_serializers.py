from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import EventBooking, EventBookingStatus, EventQuestion, EventReview

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


class EventAuthorSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="profile.display_name", read_only=True)
    avatar = serializers.ImageField(source="profile.avatar", read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "display_name", "avatar")


class EventCommentSerializer(serializers.ModelSerializer):
    """Social-style comment shape for event threads."""

    author = EventAuthorSerializer(read_only=True)
    parent_id = serializers.IntegerField(read_only=True, allow_null=True)
    ago = serializers.SerializerMethodField()
    replies_count = serializers.IntegerField(read_only=True, required=False)
    helpful_count = serializers.IntegerField(read_only=True, required=False)
    marked_helpful_by_me = serializers.SerializerMethodField()
    is_official = serializers.SerializerMethodField()
    listing_title = serializers.CharField(source="event.title", read_only=True)
    listing = serializers.IntegerField(source="event_id", read_only=True)

    class Meta:
        model = EventQuestion
        fields = (
            "id",
            "listing",
            "listing_title",
            "author",
            "parent_id",
            "body",
            "ago",
            "created_at",
            "replies_count",
            "helpful_count",
            "marked_helpful_by_me",
            "is_official",
        )
        read_only_fields = ("author", "created_at", "parent_id")

    def get_ago(self, obj):
        return _time_ago(obj.created_at)

    def get_marked_helpful_by_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if hasattr(obj, "marked_helpful_by_me"):
            return bool(obj.marked_helpful_by_me)
        return obj.helpful_votes.filter(user=request.user).exists()

    def get_is_official(self, obj):
        return obj.author_id == obj.event.organizer_id


# Back-compat alias
EventQuestionSerializer = EventCommentSerializer


class EventQuestionCreateSerializer(serializers.ModelSerializer):
    parent_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = EventQuestion
        fields = ("body", "parent_id")

    def validate(self, attrs):
        body = (attrs.get("body") or "").strip()
        if not body:
            raise serializers.ValidationError({"body": "body is required."})
        attrs["body"] = body
        parent_id = attrs.get("parent_id", None)
        event = self.context["event"]
        parent = None
        if parent_id is not None:
            parent = (
                EventQuestion.objects.filter(
                    pk=parent_id,
                    event=event,
                    is_hidden=False,
                ).first()
            )
            if not parent:
                raise serializers.ValidationError({"parent_id": "Parent comment not found."})
        attrs["_parent"] = parent
        return attrs

    def create(self, validated_data):
        parent = validated_data.pop("_parent", None)
        validated_data.pop("parent_id", None)
        return EventQuestion.objects.create(
            event=self.context["event"],
            author=self.context["request"].user,
            parent=parent,
            body=validated_data["body"],
        )


class EventAnswerCreateSerializer(serializers.Serializer):
    """Back-compat: POST a reply as a nested comment (parent = question id)."""

    body = serializers.CharField()

    def create(self, validated_data):
        question = self.context["question"]
        user = self.context["request"].user
        return EventQuestion.objects.create(
            event=question.event,
            author=user,
            parent=question,
            body=validated_data["body"].strip(),
        )


class EventAnswerSerializer(EventCommentSerializer):
    """Legacy name — answer endpoint now returns a threaded comment."""


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
