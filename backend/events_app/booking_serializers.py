import uuid
from decimal import Decimal

from django.db.models import Count, Sum
from rest_framework import serializers

from .booking_utils import ensure_check_in_token, generate_check_in_token
from .models import Event, EventBooking, EventBookingStatus, EventReview
from .ticketing_utils import event_ticketing_mode


def generate_booking_ref() -> str:
    return f"EVT-{uuid.uuid4().hex[:8].upper()}"


def event_rsvp_count(event: Event) -> int:
    agg = (
        EventBooking.objects.filter(
            event=event,
            status__in=[
                EventBookingStatus.PENDING,
                EventBookingStatus.CONFIRMED,
                EventBookingStatus.CHECKED_IN,
            ],
        ).aggregate(total=Sum("tickets"))
    )
    return int(agg["total"] or 0)


class EventBookingSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source="event.title", read_only=True)
    event_starts_at = serializers.DateTimeField(source="event.starts_at", read_only=True)
    event_venue = serializers.CharField(source="event.venue", read_only=True)
    event_city = serializers.CharField(source="event.city", read_only=True)
    event_region = serializers.CharField(source="event.region", read_only=True)
    organizer_username = serializers.CharField(source="event.organizer.username", read_only=True)
    organizer_display_name = serializers.SerializerMethodField()

    class Meta:
        model = EventBooking
        fields = (
            "id",
            "event",
            "event_title",
            "event_starts_at",
            "event_venue",
            "event_city",
            "event_region",
            "organizer_username",
            "organizer_display_name",
            "tickets",
            "total_price",
            "status",
            "booking_ref",
            "special_requests",
            "mock_payment_ref",
            "check_in_token",
            "checked_in_at",
            "has_review",
            "created_at",
        )
        read_only_fields = (
            "attendee",
            "total_price",
            "status",
            "booking_ref",
            "mock_payment_ref",
            "check_in_token",
            "checked_in_at",
            "has_review",
            "created_at",
        )

    has_review = serializers.SerializerMethodField()

    def get_organizer_display_name(self, obj):
        profile = getattr(obj.event.organizer, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return obj.event.organizer.username

    def get_has_review(self, obj):
        return hasattr(obj, "review") or EventReview.objects.filter(booking_id=obj.pk).exists()


class EventRsvpCreateSerializer(serializers.Serializer):
    tickets = serializers.IntegerField(min_value=1, max_value=20, default=1)
    special_requests = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, attrs):
        event: Event = self.context["event"]
        tickets = attrs["tickets"]
        if event.capacity:
            current = event_rsvp_count(event)
            if current + tickets > event.capacity:
                remaining = max(0, event.capacity - current)
                raise serializers.ValidationError(
                    {"tickets": f"Only {remaining} spot(s) remaining for this event."}
                )
        existing = EventBooking.objects.filter(
            event=event,
            attendee=self.context["request"].user,
        ).exclude(status=EventBookingStatus.CANCELLED).first()
        if existing:
            raise serializers.ValidationError("You already have an RSVP for this event.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        event: Event = self.context["event"]
        tickets = validated_data["tickets"]
        mode = event_ticketing_mode(event)
        total_price = None
        status = EventBookingStatus.CONFIRMED

        if mode == "on_platform":
            try:
                unit = Decimal(str(event.price).strip())
                total_price = unit * tickets
                status = EventBookingStatus.PENDING
            except Exception:
                raise serializers.ValidationError("This event is not configured for on-platform ticketing.")
        elif mode == "external":
            # External ticket sales — DELVE RSVP is attendance tracking only.
            total_price = None
            status = EventBookingStatus.CONFIRMED
        else:
            total_price = None
            status = EventBookingStatus.CONFIRMED

        booking = EventBooking.objects.create(
            event=event,
            attendee=request.user,
            tickets=tickets,
            total_price=total_price,
            status=status,
            booking_ref=generate_booking_ref(),
            special_requests=validated_data.get("special_requests", ""),
        )
        if status == EventBookingStatus.CONFIRMED:
            ensure_check_in_token(booking)
        return booking


class ProviderEventBookingSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source="event.title", read_only=True)
    event_starts_at = serializers.DateTimeField(source="event.starts_at", read_only=True)
    attendee_username = serializers.CharField(source="attendee.username", read_only=True)
    attendee_display_name = serializers.SerializerMethodField()

    class Meta:
        model = EventBooking
        fields = (
            "id",
            "event",
            "event_title",
            "event_starts_at",
            "attendee",
            "attendee_username",
            "attendee_display_name",
            "tickets",
            "total_price",
            "status",
            "booking_ref",
            "special_requests",
            "mock_payment_ref",
            "created_at",
        )

    def get_attendee_display_name(self, obj):
        profile = getattr(obj.attendee, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return obj.attendee.username


class ProviderEventBookingStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=EventBookingStatus.choices)

    def validate_status(self, value):
        booking: EventBooking = self.context["booking"]
        current = booking.status
        allowed = {
            EventBookingStatus.PENDING: {
                EventBookingStatus.CONFIRMED,
                EventBookingStatus.CANCELLED,
            },
            EventBookingStatus.CONFIRMED: {
                EventBookingStatus.CHECKED_IN,
                EventBookingStatus.CANCELLED,
                EventBookingStatus.REFUNDED,
            },
            EventBookingStatus.CHECKED_IN: set(),
            EventBookingStatus.CANCELLED: {EventBookingStatus.REFUNDED},
            EventBookingStatus.REFUNDED: set(),
        }
        if value not in allowed.get(current, set()):
            raise serializers.ValidationError(
                f"Cannot change status from {current} to {value}."
            )
        return value
