from decimal import Decimal

from rest_framework import serializers

from .models import GuideBooking, TourGuideProfile


class TourGuideProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = TourGuideProfile
        fields = (
            "id",
            "user",
            "username",
            "display_name",
            "headline",
            "bio",
            "languages",
            "regions",
            "hourly_rate",
            "photo",
            "rating_avg",
            "rating_count",
            "guest_reviews",
            "response_hours_typical",
            "tour_packages",
            "years_guiding",
            "certifications",
            "licensed_guide",
            "languages_detail",
            "portfolio_gallery",
            "default_meeting_point",
            "specialities",
            "is_active",
            "created_at",
        )
        read_only_fields = ("user", "created_at")

    def get_display_name(self, obj):
        p = getattr(obj.user, "profile", None)
        if p and getattr(p, "display_name", None):
            return (p.display_name or "").strip() or obj.user.username
        return obj.user.username

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
            "start_time",
            "duration_hours",
            "group_size",
            "meeting_point",
            "package_id",
            "notes",
            "total_price",
            "mock_payment_ref",
            "status",
            "created_at",
        )
        read_only_fields = ("client", "total_price", "mock_payment_ref", "created_at")

    def create(self, validated_data):
        request = self.context["request"]
        if not request.user.profile.email_verified:
            raise serializers.ValidationError("Verify your email before booking.")
        guide = validated_data["guide"]
        group_size = max(1, int(validated_data.get("group_size") or 1))
        duration_hours = max(1, int(validated_data.get("duration_hours") or 4))
        package_id = (validated_data.get("package_id") or "").strip()

        total = Decimal("0")
        packages = guide.tour_packages or []
        matched = None
        if package_id:
            for pkg in packages:
                if str(pkg.get("id")) == package_id:
                    matched = pkg
                    break
        if matched:
            total = Decimal(str(matched.get("price", "0")))
            ph = matched.get("hours")
            if ph is not None:
                try:
                    duration_hours = max(1, int(ph))
                except (TypeError, ValueError):
                    pass
        else:
            rate = guide.hourly_rate or Decimal("0")
            total = Decimal(str(rate)) * Decimal(duration_hours) * Decimal(group_size)

        validated_data["group_size"] = group_size
        validated_data["duration_hours"] = duration_hours
        validated_data["client"] = request.user
        validated_data["total_price"] = total
        validated_data["status"] = "pending"
        return super().create(validated_data)
