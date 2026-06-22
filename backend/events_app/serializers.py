from rest_framework import serializers

from .models import Event


class EventSerializer(serializers.ModelSerializer):
    organizer_username = serializers.CharField(source="organizer.username", read_only=True)
    organizer_display_name = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            "id",
            "organizer",
            "organizer_username",
            "organizer_display_name",
            "title",
            "description",
            "category",
            "starts_at",
            "ends_at",
            "venue",
            "region",
            "city",
            "cover_image",
            "is_free",
            "price",
            "ticket_url",
            "capacity",
            "is_published",
            "created_at",
        )
        read_only_fields = ("organizer", "created_at")

    def get_organizer_display_name(self, obj):
        profile = getattr(obj.organizer, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return obj.organizer.username

    def validate(self, attrs):
        is_free = attrs.get(
            "is_free",
            self.instance.is_free if self.instance is not None else False,
        )
        if is_free:
            attrs["price"] = ""
        elif attrs.get("price") is not None and not str(attrs.get("price", "")).strip():
            attrs["price"] = ""
        return attrs

    def create(self, validated_data):
        validated_data["organizer"] = self.context["request"].user
        return super().create(validated_data)
