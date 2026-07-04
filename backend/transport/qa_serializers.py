from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from accounts.business_access import user_can_manage_listing

from .models import BusTripAnswer, BusTripQuestion, VehicleAnswer, VehicleQuestion

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


class VehicleAnswerSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    ago = serializers.SerializerMethodField()

    class Meta:
        model = VehicleAnswer
        fields = ("id", "author", "body", "is_official", "ago", "created_at")
        read_only_fields = ("author", "is_official", "created_at")

    def get_author(self, obj):
        return _author_label(obj.author)

    def get_ago(self, obj):
        return _time_ago(obj.created_at)


class VehicleQuestionSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    ago = serializers.SerializerMethodField()
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    answers = VehicleAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = VehicleQuestion
        fields = ("id", "listing", "listing_title", "author", "body", "ago", "answers", "created_at")
        read_only_fields = ("author", "created_at", "listing")

    def get_author(self, obj):
        return _author_label(obj.author)

    def get_ago(self, obj):
        return _time_ago(obj.created_at)


class VehicleQuestionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleQuestion
        fields = ("body",)

    def create(self, validated_data):
        return VehicleQuestion.objects.create(
            listing=self.context["listing"],
            author=self.context["request"].user,
            body=validated_data["body"].strip(),
        )


class VehicleAnswerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleAnswer
        fields = ("body",)

    def create(self, validated_data):
        question = self.context["question"]
        user = self.context["request"].user
        is_official = user_can_manage_listing(user, question.listing.owner_id)
        return VehicleAnswer.objects.create(
            question=question,
            author=user,
            body=validated_data["body"].strip(),
            is_official=is_official,
        )


class BusTripAnswerSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    ago = serializers.SerializerMethodField()

    class Meta:
        model = BusTripAnswer
        fields = ("id", "author", "body", "is_official", "ago", "created_at")
        read_only_fields = ("author", "is_official", "created_at")

    def get_author(self, obj):
        return _author_label(obj.author)

    def get_ago(self, obj):
        return _time_ago(obj.created_at)


class BusTripQuestionSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    ago = serializers.SerializerMethodField()
    listing_title = serializers.SerializerMethodField()
    listing = serializers.IntegerField(source="trip_id", read_only=True)
    answers = BusTripAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = BusTripQuestion
        fields = ("id", "listing", "listing_title", "author", "body", "ago", "answers", "created_at")
        read_only_fields = ("author", "created_at")

    def get_listing_title(self, obj):
        route = obj.trip.route
        return f"{route.origin} → {route.destination}"

    def get_author(self, obj):
        return _author_label(obj.author)

    def get_ago(self, obj):
        return _time_ago(obj.created_at)


class BusTripQuestionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusTripQuestion
        fields = ("body",)

    def create(self, validated_data):
        return BusTripQuestion.objects.create(
            trip=self.context["trip"],
            author=self.context["request"].user,
            body=validated_data["body"].strip(),
        )


class BusTripAnswerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusTripAnswer
        fields = ("body",)

    def create(self, validated_data):
        question = self.context["question"]
        user = self.context["request"].user
        owner_id = question.trip.route.operator.owner_id
        is_official = user_can_manage_listing(user, owner_id)
        return BusTripAnswer.objects.create(
            question=question,
            author=user,
            body=validated_data["body"].strip(),
            is_official=is_official,
        )
