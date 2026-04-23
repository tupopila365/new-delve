from rest_framework import serializers

from .models import Event


class EventSerializer(serializers.ModelSerializer):
    organizer_username = serializers.CharField(source="organizer.username", read_only=True)

    class Meta:
        model = Event
        fields = (
            "id",
            "organizer",
            "organizer_username",
            "title",
            "description",
            "category",
            "starts_at",
            "ends_at",
            "venue",
            "region",
            "city",
            "cover_image",
            "is_published",
            "created_at",
        )
        read_only_fields = ("organizer", "created_at")

    def create(self, validated_data):
        validated_data["organizer"] = self.context["request"].user
        return super().create(validated_data)
