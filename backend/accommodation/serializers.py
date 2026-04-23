from datetime import date

from rest_framework import serializers

from .models import AccommodationBooking, AccommodationListing, BookingStatus


class AccommodationListingSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = AccommodationListing
        fields = (
            "id",
            "owner",
            "owner_username",
            "title",
            "description",
            "property_type",
            "pet_friendly",
            "wifi",
            "parking",
            "pool",
            "kitchen",
            "breakfast",
            "region",
            "city",
            "price_per_night",
            "max_guests",
            "bedrooms",
            "amenities",
            "cover_image",
            "media_gallery",
            "check_in_from",
            "check_out_until",
            "house_rules",
            "cancellation_policy",
            "faqs",
            "guest_reviews",
            "room_types",
            "rating_avg",
            "rating_count",
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


class AccommodationBookingSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source="listing.title", read_only=True)

    class Meta:
        model = AccommodationBooking
        fields = (
            "id",
            "listing",
            "listing_title",
            "guest",
            "check_in",
            "check_out",
            "guests",
            "total_price",
            "status",
            "mock_payment_ref",
            "created_at",
        )
        read_only_fields = ("guest", "total_price", "status", "mock_payment_ref", "created_at")

    def validate(self, attrs):
        listing = attrs["listing"]
        check_in = attrs["check_in"]
        check_out = attrs["check_out"]
        guests = attrs.get("guests", 1)
        if check_out <= check_in:
            raise serializers.ValidationError("check_out must be after check_in.")
        if guests > listing.max_guests:
            raise serializers.ValidationError("Too many guests for this listing.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        if not request.user.profile.email_verified:
            raise serializers.ValidationError("Verify your email before booking.")
        listing = validated_data["listing"]
        check_in: date = validated_data["check_in"]
        check_out: date = validated_data["check_out"]
        nights = (check_out - check_in).days
        if nights < 1:
            nights = 1
        total = listing.price_per_night * nights
        validated_data["guest"] = request.user
        validated_data["total_price"] = total
        validated_data["status"] = BookingStatus.PENDING
        return super().create(validated_data)
