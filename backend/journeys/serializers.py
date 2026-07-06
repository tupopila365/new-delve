from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q, QuerySet
from rest_framework import serializers

from accounts.models import PostsVisibility
from accounts.profile_access import can_view_posts
from common.gallery_media import validate_gallery_media_list
from common.story_channels import validate_story_channels

from .listing_links import LINKED_LISTING_TYPES, resolve_linked_listing
from .models import CostCategory, Journey, JourneyCostLine, JourneyEntry, JourneyLike, JourneySave, JourneyStop, JourneyVisibility

User = get_user_model()


class JourneyAuthorSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="profile.display_name", read_only=True)
    avatar = serializers.ImageField(source="profile.avatar", read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "display_name", "avatar")


class JourneyEntrySerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)

    class Meta:
        model = JourneyEntry
        fields = ("id", "body", "image", "video", "happened_at")


class JourneyStopSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    entries = JourneyEntrySerializer(many=True, required=False)
    linked_listing = serializers.SerializerMethodField()

    class Meta:
        model = JourneyStop
        fields = (
            "id",
            "order",
            "place_name",
            "region",
            "country_code",
            "arrived_on",
            "left_on",
            "notes",
            "cost",
            "linked_listing_type",
            "linked_listing_id",
            "linked_listing",
            "entries",
        )
        extra_kwargs = {
            "linked_listing_type": {"required": False, "allow_blank": True},
            "linked_listing_id": {"required": False, "allow_null": True},
        }

    def get_linked_listing(self, stop: JourneyStop):
        return resolve_linked_listing(stop.linked_listing_type, stop.linked_listing_id)

    def validate(self, attrs):
        listing_type = (attrs.get("linked_listing_type") or "").strip().lower()
        listing_id = attrs.get("linked_listing_id")
        if self.instance:
            if "linked_listing_type" not in attrs:
                listing_type = (self.instance.linked_listing_type or "").strip().lower()
            if "linked_listing_id" not in attrs:
                listing_id = self.instance.linked_listing_id
        if not listing_type:
            attrs["linked_listing_type"] = ""
            attrs["linked_listing_id"] = None
            return attrs
        if listing_type not in LINKED_LISTING_TYPES:
            raise serializers.ValidationError({"linked_listing_type": "Unsupported listing type."})
        if not listing_id:
            raise serializers.ValidationError({"linked_listing_id": "Listing id is required when linking a place."})
        if not resolve_linked_listing(listing_type, listing_id):
            raise serializers.ValidationError({"linked_listing_id": "Linked listing was not found or is not published."})
        attrs["linked_listing_type"] = listing_type
        return attrs


class JourneyCostLineSerializer(serializers.ModelSerializer):
    category = serializers.ChoiceField(choices=CostCategory.choices)

    class Meta:
        model = JourneyCostLine
        fields = ("category", "amount", "note")


class JourneySerializer(serializers.ModelSerializer):
    author = JourneyAuthorSerializer(read_only=True)
    stops = JourneyStopSerializer(many=True, required=False)
    costs = JourneyCostLineSerializer(many=True, required=False)
    likes_count = serializers.IntegerField(read_only=True, required=False)
    saves_count = serializers.IntegerField(read_only=True, required=False)
    liked_by_me = serializers.SerializerMethodField()
    saved_by_me = serializers.SerializerMethodField()
    starts_at = serializers.DateField(source="starts_on", read_only=True)

    class Meta:
        model = Journey
        fields = (
            "id",
            "author",
            "title",
            "summary",
            "cover_image",
            "starts_on",
            "starts_at",
            "ends_on",
            "days",
            "countries",
            "transport_modes",
            "party",
            "tags",
            "total_cost",
            "currency",
            "visibility",
            "is_featured",
            "journey_stories",
            "gallery_images",
            "stops",
            "costs",
            "likes_count",
            "saves_count",
            "comments_count",
            "liked_by_me",
            "saved_by_me",
            "created_at",
        )
        read_only_fields = ("author", "created_at", "comments_count", "is_featured")

    def get_liked_by_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if hasattr(obj, "liked_by_me"):
            return bool(obj.liked_by_me)
        return JourneyLike.objects.filter(journey=obj, user=request.user).exists()

    def get_saved_by_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if hasattr(obj, "saved_by_me"):
            return bool(obj.saved_by_me)
        return JourneySave.objects.filter(journey=obj, user=request.user).exists()

    def validate(self, attrs):
        starts = attrs.get("starts_on") or (self.instance.starts_on if self.instance else None)
        ends = attrs.get("ends_on") or (self.instance.ends_on if self.instance else None)
        if starts and ends and ends < starts:
            raise serializers.ValidationError({"ends_on": "End date must be on or after start date."})
        return attrs

    def validate_journey_stories(self, value):
        return validate_story_channels(value, field_label="Journey stories")

    def validate_gallery_images(self, value):
        try:
            return validate_gallery_media_list(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    @transaction.atomic
    def create(self, validated_data):
        stops_data = validated_data.pop("stops", [])
        costs_data = validated_data.pop("costs", [])
        validated_data["author"] = self.context["request"].user
        if not validated_data.get("days"):
            starts = validated_data["starts_on"]
            ends = validated_data["ends_on"]
            validated_data["days"] = max(1, (ends - starts).days + 1)
        journey = Journey.objects.create(**validated_data)
        self._replace_stops(journey, stops_data)
        self._replace_costs(journey, costs_data)
        return journey

    @transaction.atomic
    def update(self, instance, validated_data):
        stops_data = validated_data.pop("stops", None)
        costs_data = validated_data.pop("costs", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if stops_data is not None:
            instance.stops.all().delete()
            self._replace_stops(instance, stops_data)
        if costs_data is not None:
            instance.costs.all().delete()
            self._replace_costs(instance, costs_data)
        return instance

    def _replace_stops(self, journey: Journey, stops_data: list[dict]) -> None:
        for idx, stop_data in enumerate(stops_data):
            stop_data = dict(stop_data)
            stop_data.pop("id", None)
            stop_data.pop("linked_listing", None)
            raw_entries = stop_data.pop("entries", [])
            order = stop_data.pop("order", idx)
            stop = JourneyStop.objects.create(journey=journey, order=order, **stop_data)
            for entry_data in raw_entries:
                entry_data = dict(entry_data)
                entry_data.pop("id", None)
                JourneyEntry.objects.create(stop=stop, **entry_data)

    def _replace_costs(self, journey: Journey, costs_data: list[dict]) -> None:
        for cost_data in costs_data:
            JourneyCostLine.objects.create(journey=journey, **cost_data)


class JourneyListSerializer(JourneySerializer):
    """Lighter list payload — still includes stops for cards that need route preview."""

    class Meta(JourneySerializer.Meta):
        fields = JourneySerializer.Meta.fields


class JourneySearchSerializer(serializers.ModelSerializer):
    author = JourneyAuthorSerializer(read_only=True)
    starts_at = serializers.DateField(source="starts_on", read_only=True)

    class Meta:
        model = Journey
        fields = (
            "id",
            "title",
            "summary",
            "cover_image",
            "starts_at",
            "days",
            "countries",
            "tags",
            "author",
        )


def annotate_journey_engagement(qs: QuerySet[Journey], user) -> QuerySet[Journey]:
    qs = qs.annotate(
        likes_count=Count("likes", distinct=True),
        saves_count=Count("saves", distinct=True),
    )
    if user and user.is_authenticated:
        qs = qs.annotate(
            liked_by_me=Count("likes", filter=Q(likes__user=user), distinct=True),
            saved_by_me=Count("saves", filter=Q(saves__user=user), distinct=True),
        )
    return qs


def filter_journeys_for_viewer(qs: QuerySet[Journey], viewer) -> QuerySet[Journey]:
    qs = qs.filter(is_hidden=False)
    if viewer and viewer.is_authenticated:
        from social.models import Follow

        following_ids = Follow.objects.filter(follower=viewer).values("following_id")
        return qs.filter(
            Q(author=viewer)
            | (
                Q(visibility=JourneyVisibility.PUBLIC)
                & ~Q(author__profile__posts_visibility=PostsVisibility.PRIVATE)
                & (Q(author__profile__is_private=False) | Q(author_id__in=following_ids))
            )
        )
    return qs.filter(
        visibility=JourneyVisibility.PUBLIC,
        author__profile__posts_visibility=PostsVisibility.PUBLIC,
        author__profile__is_private=False,
    )


def can_view_journey(viewer, journey: Journey) -> bool:
    if journey.is_hidden:
        return False
    if viewer and viewer.is_authenticated and viewer.pk == journey.author_id:
        return True
    if journey.visibility != JourneyVisibility.PUBLIC:
        return False
    return can_view_posts(viewer, journey.author)
