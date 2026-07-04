from datetime import date

from rest_framework import serializers

from accommodation.models import BookingStatus

from .models import (
    BusOperator,
    BusRoute,
    BusTrip,
    SeatReservation,
    SeatReservationReview,
    VehicleRentalBooking,
    VehicleRentalListing,
    VehicleRentalReview,
)


class VehicleRentalListingSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    owner_display_name = serializers.SerializerMethodField()
    owner_bio = serializers.SerializerMethodField()
    owner_region = serializers.SerializerMethodField()
    owner_city = serializers.SerializerMethodField()
    owner_avatar = serializers.SerializerMethodField()

    class Meta:
        model = VehicleRentalListing
        fields = (
            "id",
            "owner",
            "owner_username",
            "owner_display_name",
            "owner_bio",
            "owner_region",
            "owner_city",
            "owner_avatar",
            "title",
            "make",
            "model",
            "year",
            "transmission",
            "seats",
            "vehicle_type",
            "description",
            "pickup_location",
            "included_features",
            "gallery_images",
            "price_per_day",
            "region",
            "city",
            "cover_image",
            "is_active",
            "rating_avg",
            "rating_count",
            "created_at",
        )
        read_only_fields = ("owner", "created_at")

    def get_owner_display_name(self, obj):
        profile = getattr(obj.owner, "profile", None)
        if profile and getattr(profile, "display_name", "").strip():
            return profile.display_name.strip()
        return obj.owner.username

    def get_owner_bio(self, obj):
        profile = getattr(obj.owner, "profile", None)
        if profile and profile.bio:
            return profile.bio.strip()
        return ""

    def get_owner_region(self, obj):
        profile = getattr(obj.owner, "profile", None)
        return profile.region if profile else ""

    def get_owner_city(self, obj):
        profile = getattr(obj.owner, "profile", None)
        return profile.city if profile else ""

    def get_owner_avatar(self, obj):
        profile = getattr(obj.owner, "profile", None)
        if not profile or not profile.avatar:
            return None
        request = self.context.get("request")
        url = profile.avatar.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def create(self, validated_data):
        user = self.context["request"].user
        if not hasattr(user, "profile") or user.profile.user_type != "service_provider":
            raise serializers.ValidationError("Only service providers can create listings.")
        validated_data["owner"] = user
        return super().create(validated_data)


class VehicleRentalBookingSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    listing_owner_username = serializers.CharField(source="listing.owner.username", read_only=True)
    owner_display_name = serializers.SerializerMethodField()
    listing_region = serializers.CharField(source="listing.region", read_only=True)
    listing_city = serializers.CharField(source="listing.city", read_only=True)
    has_review = serializers.SerializerMethodField()

    class Meta:
        model = VehicleRentalBooking
        fields = (
            "id",
            "listing",
            "listing_title",
            "listing_owner_username",
            "owner_display_name",
            "listing_region",
            "listing_city",
            "renter",
            "start_date",
            "end_date",
            "total_price",
            "status",
            "mock_payment_ref",
            "has_review",
            "created_at",
        )
        read_only_fields = ("renter", "total_price", "status", "mock_payment_ref", "has_review", "created_at")

    def get_has_review(self, obj):
        try:
            obj.review
            return True
        except VehicleRentalReview.DoesNotExist:
            return False

    def get_owner_display_name(self, obj):
        profile = getattr(obj.listing.owner, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return obj.listing.owner.username

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
    operator_owner_username = serializers.CharField(source="operator.owner.username", read_only=True)

    class Meta:
        model = BusRoute
        fields = (
            "id",
            "operator",
            "operator_name",
            "operator_owner_username",
            "origin",
            "destination",
            "description",
            "cover_image",
            "gallery_images",
        )


class BusTripSerializer(serializers.ModelSerializer):
    route_detail = BusRouteSerializer(source="route", read_only=True)
    available_seats = serializers.SerializerMethodField()
    occupied_seats = serializers.SerializerMethodField()

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
            "amenities",
            "is_active",
            "available_seats",
            "occupied_seats",
        )

    def get_available_seats(self, obj):
        taken = obj.reservations.filter(
            status__in=[BookingStatus.PENDING, BookingStatus.CONFIRMED]
        ).count()
        return max(0, obj.total_seats - taken)

    def get_occupied_seats(self, obj):
        return list(
            obj.reservations.filter(
                status__in=[BookingStatus.PENDING, BookingStatus.CONFIRMED]
            )
            .order_by("seat_number")
            .values_list("seat_number", flat=True)
        )


class SeatReservationSerializer(serializers.ModelSerializer):
    trip_departs_at = serializers.DateTimeField(source="trip.departs_at", read_only=True)
    route_label = serializers.SerializerMethodField()
    operator_name = serializers.CharField(source="trip.route.operator.name", read_only=True)
    operator_owner_username = serializers.CharField(
        source="trip.route.operator.owner.username",
        read_only=True,
    )
    seat_price = serializers.DecimalField(
        source="trip.price",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    has_review = serializers.SerializerMethodField()

    class Meta:
        model = SeatReservation
        fields = (
            "id",
            "trip",
            "trip_departs_at",
            "route_label",
            "operator_name",
            "operator_owner_username",
            "passenger",
            "seat_number",
            "seat_price",
            "status",
            "mock_payment_ref",
            "has_review",
            "created_at",
        )
        read_only_fields = ("passenger", "status", "mock_payment_ref", "has_review", "created_at")

    def get_has_review(self, obj):
        try:
            obj.review
            return True
        except SeatReservationReview.DoesNotExist:
            return False

    def get_route_label(self, obj):
        route = obj.trip.route
        return f"{route.origin} → {route.destination}"

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
