from rest_framework import serializers

from .models import FoodVenue


class FoodVenueSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = FoodVenue
        fields = (
            "id",
            "owner",
            "owner_username",
            "name",
            "description",
            "cuisine",
            "region",
            "city",
            "price_level",
            "cover_image",
            "rating_avg",
            "rating_count",
            "is_active",
            "created_at",
        )
        read_only_fields = ("owner", "created_at")

    def create(self, validated_data):
        user = self.context["request"].user
        if not hasattr(user, "profile") or user.profile.user_type != "service_provider":
            raise serializers.ValidationError("Only service providers can add venues.")
        validated_data["owner"] = user
        return super().create(validated_data)
