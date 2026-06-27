from django.utils import timezone
from rest_framework import serializers

from .access import primary_event_business, user_can_manage_event_template
from .models import Event, EventRecurrence, EventRecurrenceTemplate
from .ticketing_utils import validate_event_ticketing


class EventRecurrenceTemplateSerializer(serializers.ModelSerializer):
    organizer_username = serializers.CharField(source="organizer.username", read_only=True)
    spawned_count = serializers.SerializerMethodField()

    class Meta:
        model = EventRecurrenceTemplate
        fields = (
            "id",
            "organizer",
            "organizer_username",
            "business",
            "title",
            "description",
            "category",
            "venue",
            "region",
            "city",
            "cover_image",
            "is_free",
            "price",
            "ticket_url",
            "capacity",
            "default_start_time",
            "default_duration_minutes",
            "recurrence",
            "weekday",
            "day_of_month",
            "is_active",
            "last_spawned_at",
            "spawned_count",
            "created_at",
        )
        read_only_fields = ("organizer", "last_spawned_at", "created_at")

    def get_spawned_count(self, obj):
        return obj.spawned_events.count()

    def validate(self, attrs):
        is_free = attrs.get(
            "is_free",
            self.instance.is_free if self.instance is not None else False,
        )
        price = attrs.get("price", self.instance.price if self.instance else "")
        ticket_url = attrs.get("ticket_url", self.instance.ticket_url if self.instance else "")
        if is_free:
            attrs.update({"is_free": True, "price": "", "ticket_url": ticket_url or ""})
            return attrs
        try:
            normalized = validate_event_ticketing(
                is_free=False,
                price=price or "",
                ticket_url=ticket_url or "",
                from_template=True,
            )
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        attrs.update(normalized)
        recurrence = attrs.get(
            "recurrence",
            self.instance.recurrence if self.instance else EventRecurrence.WEEKLY,
        )
        if recurrence == EventRecurrence.MONTHLY:
            dom = attrs.get("day_of_month", self.instance.day_of_month if self.instance else None)
            if not dom:
                raise serializers.ValidationError({"day_of_month": "Required for monthly templates."})
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["organizer"] = user
        if not validated_data.get("business"):
            biz = primary_event_business(user)
            if biz:
                validated_data["business"] = biz
        return super().create(validated_data)


class EventTemplateSpawnSerializer(serializers.Serializer):
    starts_at = serializers.DateTimeField(required=False)

    def create(self, validated_data):
        template: EventRecurrenceTemplate = self.context["template"]
        from .analytics_services import next_occurrence_starts_at

        starts_at = validated_data.get("starts_at")
        if starts_at is None:
            starts_at = next_occurrence_starts_at(template)
        if timezone.is_naive(starts_at):
            starts_at = timezone.make_aware(starts_at, timezone.get_current_timezone())

        ends_at = None
        if template.default_duration_minutes:
            from datetime import timedelta

            ends_at = starts_at + timedelta(minutes=template.default_duration_minutes)

        event = Event.objects.create(
            organizer=template.organizer,
            business=template.business,
            title=template.title,
            description=template.description,
            category=template.category,
            starts_at=starts_at,
            ends_at=ends_at,
            venue=template.venue,
            region=template.region,
            city=template.city,
            cover_image=template.cover_image,
            is_free=template.is_free,
            price=template.price,
            ticket_url=template.ticket_url,
            capacity=template.capacity,
            is_published=True,
            recurrence_template=template,
        )
        template.last_spawned_at = starts_at
        template.save(update_fields=["last_spawned_at"])
        return event
