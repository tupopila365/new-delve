from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from accounts.business_access import user_can_manage_listing

from .models import FoodAnswer, FoodQuestion

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


class FoodAnswerSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    ago = serializers.SerializerMethodField()

    class Meta:
        model = FoodAnswer
        fields = ("id", "author", "body", "is_official", "ago", "created_at")
        read_only_fields = ("author", "is_official", "created_at")

    def get_author(self, obj):
        return _author_label(obj.author)

    def get_ago(self, obj):
        return _time_ago(obj.created_at)


class FoodQuestionSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    ago = serializers.SerializerMethodField()
    listing_title = serializers.CharField(source="venue.name", read_only=True)
    listing = serializers.IntegerField(source="venue_id", read_only=True)
    answers = FoodAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = FoodQuestion
        fields = ("id", "listing", "listing_title", "author", "body", "ago", "answers", "created_at")
        read_only_fields = ("author", "created_at")

    def get_author(self, obj):
        return _author_label(obj.author)

    def get_ago(self, obj):
        return _time_ago(obj.created_at)


class FoodQuestionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodQuestion
        fields = ("body",)

    def create(self, validated_data):
        return FoodQuestion.objects.create(
            venue=self.context["venue"],
            author=self.context["request"].user,
            body=validated_data["body"].strip(),
        )


class FoodAnswerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodAnswer
        fields = ("body",)

    def create(self, validated_data):
        question = self.context["question"]
        user = self.context["request"].user
        is_official = user_can_manage_listing(user, question.venue.owner_id)
        return FoodAnswer.objects.create(
            question=question,
            author=user,
            body=validated_data["body"].strip(),
            is_official=is_official,
        )
