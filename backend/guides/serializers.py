from rest_framework import serializers

from .models import GuideBooking, TourGuideProfile


class TourGuideProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = TourGuideProfile
        fields = (
            "id",
            "user",
            "username",
            "headline",
            "bio",
            "languages",
            "regions",
            "hourly_rate",
            "photo",
            "rating_avg",
            "rating_count",
            "is_active",
            "created_at",
        )
        read_only_fields = ("user", "created_at")

    def create(self, validated_data):
        user = self.context["request"].user
        if not hasattr(user, "profile") or user.profile.user_type != "service_provider":
            raise serializers.ValidationError("Only service providers can be tour guides.")
        if TourGuideProfile.objects.filter(user=user).exists():
            raise serializers.ValidationError("You already have a guide profile.")
        validated_data["user"] = user
        return super().create(validated_data)


class GuideBookingSerializer(serializers.ModelSerializer):
    guide_headline = serializers.CharField(source="guide.headline", read_only=True)

    class Meta:
        model = GuideBooking
        fields = (
            "id",
            "guide",
            "guide_headline",
            "client",
            "date",
            "notes",
            "total_price",
            "mock_payment_ref",
            "status",
            "created_at",
        )
        read_only_fields = ("client", "mock_payment_ref", "created_at")

    def create(self, validated_data):
        request = self.context["request"]
        if not request.user.profile.email_verified:
            raise serializers.ValidationError("Verify your email before booking.")
        guide = validated_data["guide"]
        hours = 4
        rate = guide.hourly_rate or 0
        validated_data["client"] = request.user
        validated_data["total_price"] = rate * hours
        validated_data["status"] = "pending"
        return super().create(validated_data)
