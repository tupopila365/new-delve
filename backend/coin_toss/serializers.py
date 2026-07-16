from rest_framework import serializers

from .models import AntiCommercialFlag, CommunityVote, LocationCategory, TossLocation


class TossLocationSerializer(serializers.ModelSerializer):
    upvote_count = serializers.IntegerField(read_only=True)
    commercial_flag_count = serializers.IntegerField(read_only=True)
    category_label = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = TossLocation
        fields = (
            "id",
            "name",
            "category",
            "category_label",
            "description",
            "latitude",
            "longitude",
            "region",
            "city",
            "open_source_ref",
            "is_excluded",
            "upvote_count",
            "commercial_flag_count",
            "created_at",
        )
        read_only_fields = fields


class TossRequestSerializer(serializers.Serializer):
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    radius_miles = serializers.FloatField(required=False, default=5.0, min_value=0.1, max_value=50)
    min_upvotes = serializers.IntegerField(required=False, default=3, min_value=0, max_value=100)


class VoteRequestSerializer(serializers.Serializer):
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)


class AddLocationSerializer(serializers.Serializer):
    """Add a favourite gem to the Quintos from the user's live location."""

    name = serializers.CharField(max_length=200)
    category = serializers.ChoiceField(
        choices=LocationCategory.choices,
        default=LocationCategory.OTHER,
    )
    description = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    accuracy_m = serializers.FloatField(required=False, allow_null=True, min_value=0)
    region = serializers.CharField(required=False, allow_blank=True, max_length=120)
    city = serializers.CharField(required=False, allow_blank=True, max_length=120)


class FlagRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=400)


class CommunityVoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityVote
        fields = ("id", "location", "created_at")
        read_only_fields = fields


class AntiCommercialFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = AntiCommercialFlag
        fields = ("id", "location", "reason", "created_at")
        read_only_fields = fields
