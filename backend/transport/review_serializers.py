from rest_framework import serializers

from accommodation.models import BookingStatus

from .models import (
    SeatReservation,
    SeatReservationReview,
    VehicleRentalBooking,
    VehicleRentalReview,
)
from .review_services import sync_bus_trip_rating, sync_vehicle_listing_rating


class VehicleRentalReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleRentalReview
        fields = ("id", "rating", "body", "seller_reply", "seller_replied_at", "created_at")
        read_only_fields = fields


class VehicleRentalReviewCreateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    body = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, attrs):
        booking: VehicleRentalBooking = self.context["booking"]
        user = self.context["request"].user
        if booking.renter_id != user.id:
            raise serializers.ValidationError("Not your booking.")
        if booking.status != BookingStatus.CHECKED_OUT:
            raise serializers.ValidationError("You can review after your rental is checked out.")
        if hasattr(booking, "review"):
            raise serializers.ValidationError("You already reviewed this rental.")
        return attrs

    def create(self, validated_data):
        booking: VehicleRentalBooking = self.context["booking"]
        review = VehicleRentalReview.objects.create(
            listing=booking.listing,
            booking=booking,
            reviewer=self.context["request"].user,
            rating=validated_data["rating"],
            body=validated_data.get("body", ""),
        )
        sync_vehicle_listing_rating(booking.listing)
        return review


class SeatReservationReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeatReservationReview
        fields = ("id", "rating", "body", "seller_reply", "seller_replied_at", "created_at")
        read_only_fields = fields


class SeatReservationReviewCreateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    body = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, attrs):
        reservation: SeatReservation = self.context["reservation"]
        user = self.context["request"].user
        if reservation.passenger_id != user.id:
            raise serializers.ValidationError("Not your reservation.")
        if reservation.status != BookingStatus.CHECKED_OUT:
            raise serializers.ValidationError("You can review after your trip is checked out.")
        if hasattr(reservation, "review"):
            raise serializers.ValidationError("You already reviewed this trip.")
        return attrs

    def create(self, validated_data):
        reservation: SeatReservation = self.context["reservation"]
        review = SeatReservationReview.objects.create(
            trip=reservation.trip,
            reservation=reservation,
            reviewer=self.context["request"].user,
            rating=validated_data["rating"],
            body=validated_data.get("body", ""),
        )
        sync_bus_trip_rating(reservation.trip)
        return review
