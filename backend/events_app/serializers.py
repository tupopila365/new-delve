from rest_framework import serializers

from .access import primary_event_business
from .models import Event, EventLike, EventSave
from .ticketing_utils import event_ticketing_mode, validate_event_ticketing


class EventSerializer(serializers.ModelSerializer):
    organizer_username = serializers.CharField(source="organizer.username", read_only=True)
    organizer_display_name = serializers.SerializerMethodField()
    business_name = serializers.CharField(source="business.business_name", read_only=True)
    business_slug = serializers.CharField(source="business.slug", read_only=True)
    likes_count = serializers.IntegerField(read_only=True, required=False)
    saves_count = serializers.IntegerField(read_only=True, required=False)
    rsvp_count = serializers.IntegerField(read_only=True, required=False)
    liked_by_me = serializers.BooleanField(read_only=True, required=False)
    saved_by_me = serializers.BooleanField(read_only=True, required=False)
    attending_by_me = serializers.BooleanField(read_only=True, required=False)
    ticketing_mode = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            "id",
            "organizer",
            "organizer_username",
            "organizer_display_name",
            "business",
            "business_name",
            "business_slug",
            "title",
            "description",
            "category",
            "starts_at",
            "ends_at",
            "venue",
            "region",
            "city",
            "cover_image",
            "is_free",
            "price",
            "ticket_url",
            "external_ticket_clicks",
            "ticketing_mode",
            "capacity",
            "recurrence_template",
            "is_published",
            "likes_count",
            "saves_count",
            "rsvp_count",
            "liked_by_me",
            "saved_by_me",
            "attending_by_me",
            "created_at",
        )
        read_only_fields = ("organizer", "external_ticket_clicks", "created_at")

    def get_ticketing_mode(self, obj):
        return event_ticketing_mode(obj)

    def get_organizer_display_name(self, obj):
        profile = getattr(obj.organizer, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return obj.organizer.username

    def validate(self, attrs):
        is_free = attrs.get(
            "is_free",
            self.instance.is_free if self.instance is not None else False,
        )
        price = attrs.get("price", self.instance.price if self.instance else "")
        ticket_url = attrs.get("ticket_url", self.instance.ticket_url if self.instance else "")
        try:
            normalized = validate_event_ticketing(
                is_free=is_free,
                price=price or "",
                ticket_url=ticket_url or "",
                from_template=False,
            )
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        attrs.update(normalized)
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        if not hasattr(user, "profile") or user.profile.user_type != "service_provider":
            raise serializers.ValidationError("Only service providers can create events.")
        validated_data["organizer"] = user
        if not validated_data.get("business"):
            biz = primary_event_business(user)
            if biz:
                validated_data["business"] = biz
        return super().create(validated_data)
