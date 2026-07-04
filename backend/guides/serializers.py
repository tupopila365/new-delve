from decimal import Decimal

from rest_framework import serializers

from .models import GuideBooking, GuideSave, TourGuideProfile
from .provider_serializers import _photo_url
from .review_services import user_can_review_guide, user_has_reviewed_guide


class TourGuideProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    display_name = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    portfolio_gallery = serializers.SerializerMethodField()
    saved_by_me = serializers.SerializerMethodField()
    saves_count = serializers.SerializerMethodField()
    has_reviewed = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()

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
            "guide_stories",
            "default_meeting_point",
            "specialities",
            "saved_by_me",
            "saves_count",
            "has_reviewed",
            "can_review",
            "is_active",
            "created_at",
        )
        read_only_fields = (
            "user",
            "saved_by_me",
            "saves_count",
            "has_reviewed",
            "can_review",
            "created_at",
        )

    def get_display_name(self, obj):
        p = getattr(obj.user, "profile", None)
        if p and getattr(p, "display_name", None):
            return (p.display_name or "").strip() or obj.user.username
        return obj.user.username

    def get_photo(self, obj):
        return _photo_url(obj, self.context.get("request"))

    def get_portfolio_gallery(self, obj):
        rows = []
        for item in obj.portfolio_gallery or []:
            if not isinstance(item, dict) or item.get("is_profile"):
                continue
            src = str(item.get("src") or "").strip()
            if not src:
                continue
            entry = {"src": src}
            caption = str(item.get("caption") or "").strip()
            if caption:
                entry["caption"] = caption
            rows.append(entry)
        return rows

    def get_saved_by_me(self, obj):
        annotated = getattr(obj, "saved_by_me", None)
        if annotated is not None:
            return bool(annotated)
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return GuideSave.objects.filter(guide=obj, user=request.user).exists()

    def get_saves_count(self, obj):
        annotated = getattr(obj, "saves_count", None)
        if annotated is not None:
            return int(annotated)
        return GuideSave.objects.filter(guide=obj).count()

    def get_has_reviewed(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return user_has_reviewed_guide(request.user, obj)

    def get_can_review(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return user_can_review_guide(request.user, obj)

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
    guide_username = serializers.CharField(source="guide.user.username", read_only=True)
    package_title = serializers.SerializerMethodField()
    has_reviewed = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()

    class Meta:
        model = GuideBooking
        fields = (
            "id",
            "guide",
            "guide_headline",
            "guide_username",
            "client",
            "date",
            "start_time",
            "duration_hours",
            "group_size",
            "meeting_point",
            "package_id",
            "package_title",
            "notes",
            "total_price",
            "mock_payment_ref",
            "status",
            "has_reviewed",
            "can_review",
            "created_at",
        )
        read_only_fields = ("client", "total_price", "mock_payment_ref", "created_at", "status")

    def get_package_title(self, obj):
        from .provider_serializers import _package_title

        return _package_title(obj.guide, obj.package_id)

    def get_has_reviewed(self, obj):
        return user_has_reviewed_guide(obj.client, obj.guide)

    def get_can_review(self, obj):
        request = self.context.get("request")
        user = request.user if request else obj.client
        if obj.status != "completed":
            return False
        return user_can_review_guide(user, obj.guide)

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
