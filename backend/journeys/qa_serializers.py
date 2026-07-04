from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import JourneyAnswer, JourneyQuestion

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


class JourneyAnswerSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    ago = serializers.SerializerMethodField()

    class Meta:
        model = JourneyAnswer
        fields = ("id", "author", "body", "is_official", "ago", "created_at")
        read_only_fields = ("author", "is_official", "created_at")

    def get_author(self, obj):
        return _author_label(obj.author)

    def get_ago(self, obj):
        return _time_ago(obj.created_at)


class JourneyQuestionSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    ago = serializers.SerializerMethodField()
    listing_title = serializers.CharField(source="journey.title", read_only=True)
    listing = serializers.IntegerField(source="journey_id", read_only=True)
    journey_title = serializers.CharField(source="journey.title", read_only=True)
    answers = JourneyAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = JourneyQuestion
        fields = (
            "id",
            "listing",
            "listing_title",
            "journey_title",
            "author",
            "body",
            "ago",
            "answers",
            "created_at",
        )
        read_only_fields = ("author", "created_at")

    def get_author(self, obj):
        return _author_label(obj.author)

    def get_ago(self, obj):
        return _time_ago(obj.created_at)


class JourneyQuestionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = JourneyQuestion
        fields = ("body",)

    def create(self, validated_data):
        return JourneyQuestion.objects.create(
            journey=self.context["journey"],
            author=self.context["request"].user,
            body=validated_data["body"].strip(),
        )


class JourneyAnswerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = JourneyAnswer
        fields = ("body",)

    def create(self, validated_data):
        question = self.context["question"]
        user = self.context["request"].user
        is_official = user.pk == question.journey.author_id
        return JourneyAnswer.objects.create(
            question=question,
            author=user,
            body=validated_data["body"].strip(),
            is_official=is_official,
        )
