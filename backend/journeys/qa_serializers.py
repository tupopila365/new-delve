from django.utils import timezone
from rest_framework import serializers

from .models import JourneyQuestion
from .serializers import JourneyAuthorSerializer


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


class JourneyCommentSerializer(serializers.ModelSerializer):
    """Social-style comment shape for journey threads."""

    author = JourneyAuthorSerializer(read_only=True)
    parent_id = serializers.IntegerField(read_only=True, allow_null=True)
    ago = serializers.SerializerMethodField()
    replies_count = serializers.IntegerField(read_only=True, required=False)
    helpful_count = serializers.IntegerField(read_only=True, required=False)
    marked_helpful_by_me = serializers.SerializerMethodField()
    is_official = serializers.SerializerMethodField()
    listing_title = serializers.CharField(source="journey.title", read_only=True)
    listing = serializers.IntegerField(source="journey_id", read_only=True)
    journey_title = serializers.CharField(source="journey.title", read_only=True)

    class Meta:
        model = JourneyQuestion
        fields = (
            "id",
            "listing",
            "listing_title",
            "journey_title",
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
        return obj.author_id == obj.journey.author_id


# Back-compat alias used by older imports / inbox.
JourneyQuestionSerializer = JourneyCommentSerializer


class JourneyQuestionCreateSerializer(serializers.ModelSerializer):
    parent_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = JourneyQuestion
        fields = ("body", "parent_id")

    def validate(self, attrs):
        body = (attrs.get("body") or "").strip()
        if not body:
            raise serializers.ValidationError({"body": "body is required."})
        attrs["body"] = body
        parent_id = attrs.get("parent_id", None)
        journey = self.context["journey"]
        parent = None
        if parent_id is not None:
            parent = (
                JourneyQuestion.objects.filter(
                    pk=parent_id,
                    journey=journey,
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
        return JourneyQuestion.objects.create(
            journey=self.context["journey"],
            author=self.context["request"].user,
            parent=parent,
            body=validated_data["body"],
        )


# Legacy create serializers kept for answer shim.
class JourneyAnswerCreateSerializer(serializers.Serializer):
    body = serializers.CharField()

    def create(self, validated_data):
        question = self.context["question"]
        user = self.context["request"].user
        return JourneyQuestion.objects.create(
            journey=question.journey,
            author=user,
            parent=question,
            body=validated_data["body"].strip(),
        )


class JourneyAnswerSerializer(JourneyCommentSerializer):
    """Legacy name — answer endpoint now returns a threaded comment."""
