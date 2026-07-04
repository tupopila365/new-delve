from django.utils import timezone
from rest_framework import serializers

from accommodation.models import BookingStatus

from .models import FoodReservation, FoodVenue


class FoodReservationSerializer(serializers.ModelSerializer):
    venue_name = serializers.CharField(source="venue.name", read_only=True)
    venue_city = serializers.CharField(source="venue.city", read_only=True)
    venue_region = serializers.CharField(source="venue.region", read_only=True)
    owner_username = serializers.CharField(source="venue.owner.username", read_only=True)
    owner_display_name = serializers.SerializerMethodField()

    class Meta:
        model = FoodReservation
        fields = (
            "id",
            "venue",
            "venue_name",
            "venue_city",
            "venue_region",
            "owner_username",
            "owner_display_name",
            "reserved_for",
            "party_size",
            "special_requests",
            "status",
            "created_at",
        )
        read_only_fields = ("status", "created_at")

    def get_owner_display_name(self, obj):
        profile = getattr(obj.venue.owner, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return obj.venue.owner.username


class FoodReservationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodReservation
        fields = ("venue", "reserved_for", "party_size", "special_requests")

    def validate_venue(self, venue: FoodVenue):
        if not venue.is_active:
            raise serializers.ValidationError("This venue is not accepting reservations.")
        if not venue.reservations:
            raise serializers.ValidationError("This venue does not take table reservations on DELVE.")
        return venue

    def validate_reserved_for(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Choose a date and time in the future.")
        return value

    def validate_party_size(self, value):
        if value < 1 or value > 20:
            raise serializers.ValidationError("Party size must be between 1 and 20.")
        return value

    def validate(self, attrs):
        venue = attrs["venue"]
        guest = self.context["request"].user
        active = FoodReservation.objects.filter(
            venue=venue,
            guest=guest,
            status__in=[
                BookingStatus.PENDING,
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
            ],
        ).exists()
        if active:
            raise serializers.ValidationError("You already have an active reservation for this venue.")
        return attrs

    def create(self, validated_data):
        return FoodReservation.objects.create(
            guest=self.context["request"].user,
            status=BookingStatus.PENDING,
            **validated_data,
        )


class ProviderFoodReservationSerializer(serializers.ModelSerializer):
    venue_name = serializers.CharField(source="venue.name", read_only=True)
    guest_username = serializers.CharField(source="guest.username", read_only=True)
    guest_display_name = serializers.SerializerMethodField()

    class Meta:
        model = FoodReservation
        fields = (
            "id",
            "venue",
            "venue_name",
            "guest",
            "guest_username",
            "guest_display_name",
            "reserved_for",
            "party_size",
            "special_requests",
            "status",
            "created_at",
        )

    def get_guest_display_name(self, obj):
        profile = getattr(obj.guest, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return obj.guest.username
