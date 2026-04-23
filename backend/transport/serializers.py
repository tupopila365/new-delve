from datetime import date

from rest_framework import serializers

from accommodation.models import BookingStatus

from .models import (
    BusOperator,
    BusRoute,
    BusTrip,
    SeatReservation,
    VehicleRentalBooking,
    VehicleRentalListing,
)


class VehicleRentalListingSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = VehicleRentalListing
        fields = (
            "id",
            "owner",
            "owner_username",
            "title",
            "make",
            "model",
            "year",
            "transmission",
            "seats",
            "price_per_day",
            "region",
            "city",
            "cover_image",
            "is_active",
            "created_at",
        )
        read_only_fields = ("owner", "created_at")

    def create(self, validated_data):
        user = self.context["request"].user
        if not hasattr(user, "profile") or user.profile.user_type != "service_provider":
            raise serializers.ValidationError("Only service providers can create listings.")
        validated_data["owner"] = user
        return super().create(validated_data)


class VehicleRentalBookingSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source="listing.title", read_only=True)

    class Meta:
        model = VehicleRentalBooking
        fields = (
            "id",
            "listing",
            "listing_title",
            "renter",
            "start_date",
            "end_date",
            "total_price",
            "status",
            "mock_payment_ref",
            "created_at",
        )
        read_only_fields = ("renter", "total_price", "status", "mock_payment_ref", "created_at")

    def validate(self, attrs):
        listing = attrs["listing"]
        start: date = attrs["start_date"]
        end: date = attrs["end_date"]
        if end < start:
            raise serializers.ValidationError("end_date must be on or after start_date.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        if not request.user.profile.email_verified:
            raise serializers.ValidationError("Verify your email before booking.")
        listing = validated_data["listing"]
        start: date = validated_data["start_date"]
        end: date = validated_data["end_date"]
        days = (end - start).days + 1
        if days < 1:
            days = 1
        validated_data["renter"] = request.user
        validated_data["total_price"] = listing.price_per_day * days
        validated_data["status"] = BookingStatus.PENDING
        return super().create(validated_data)


class BusOperatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusOperator
        fields = ("id", "name", "contact_phone", "region", "created_at")
        read_only_fields = ("owner", "created_at")

    def create(self, validated_data):
        user = self.context["request"].user
        if not hasattr(user, "profile") or user.profile.user_type != "service_provider":
            raise serializers.ValidationError("Only service providers can register operators.")
        validated_data["owner"] = user
        return super().create(validated_data)


class BusRouteSerializer(serializers.ModelSerializer):
    operator_name = serializers.CharField(source="operator.name", read_only=True)

    class Meta:
        model = BusRoute
        fields = ("id", "operator", "operator_name", "origin", "destination", "description")


class BusTripSerializer(serializers.ModelSerializer):
    route_detail = BusRouteSerializer(source="route", read_only=True)
    available_seats = serializers.SerializerMethodField()

    class Meta:
        model = BusTrip
        fields = (
            "id",
            "route",
            "route_detail",
            "departs_at",
            "arrives_at",
            "price",
            "total_seats",
            "is_active",
            "available_seats",
        )

    def get_available_seats(self, obj):
        taken = obj.reservations.filter(
            status__in=[BookingStatus.PENDING, BookingStatus.CONFIRMED]
        ).count()
        return max(0, obj.total_seats - taken)


class SeatReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeatReservation
        fields = (
            "id",
            "trip",
            "passenger",
            "seat_number",
            "status",
            "mock_payment_ref",
            "created_at",
        )
        read_only_fields = ("passenger", "status", "mock_payment_ref", "created_at")

    def validate(self, attrs):
        trip = attrs["trip"]
        seat = attrs["seat_number"]
        if seat < 1 or seat > trip.total_seats:
            raise serializers.ValidationError("Invalid seat number.")
        if (
            SeatReservation.objects.filter(
                trip=trip,
                seat_number=seat,
                status__in=[BookingStatus.PENDING, BookingStatus.CONFIRMED],
            ).exists()
        ):
            raise serializers.ValidationError("Seat already taken.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        if not request.user.profile.email_verified:
            raise serializers.ValidationError("Verify your email before booking.")
        validated_data["passenger"] = request.user
        validated_data["status"] = BookingStatus.PENDING
        return super().create(validated_data)
