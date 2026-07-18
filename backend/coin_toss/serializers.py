from rest_framework import serializers

from .models import AntiCommercialFlag, CommunityVote, LocationCategory, TossLocation

MAX_TOSS_MEDIA = 8


class TossMediaItemSerializer(serializers.Serializer):
    url = serializers.CharField(max_length=1000)
    kind = serializers.ChoiceField(choices=("image", "video"), default="image")


def normalize_toss_media(raw) -> list[dict]:
    out: list[dict] = []
    if not isinstance(raw, list):
        return out
    seen: set[str] = set()
    for item in raw:
        if isinstance(item, str):
            url = item.strip()
            kind = "image"
        elif isinstance(item, dict):
            url = str(item.get("url") or item.get("image") or "").strip()
            kind = "video" if item.get("kind") == "video" else "image"
        else:
            continue
        if not url or url in seen:
            continue
        seen.add(url)
        out.append({"url": url, "kind": kind})
    return out[:MAX_TOSS_MEDIA]


class TossLocationSerializer(serializers.ModelSerializer):
    upvote_count = serializers.IntegerField(read_only=True)
    commercial_flag_count = serializers.IntegerField(read_only=True)
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    media = serializers.SerializerMethodField()
    saved_by_me = serializers.SerializerMethodField()

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
            "media",
            "is_excluded",
            "upvote_count",
            "commercial_flag_count",
            "saved_by_me",
            "created_at",
        )
        read_only_fields = fields

    def get_media(self, obj):
        return normalize_toss_media(obj.media)

    def get_saved_by_me(self, obj):
        annotated = getattr(obj, "saved_by_me", None)
        if annotated is not None:
            return bool(annotated)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return False
        from .models import TossLocationSave

        return TossLocationSave.objects.filter(user=user, location_id=obj.pk).exists()


class TossRequestSerializer(serializers.Serializer):
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    radius_miles = serializers.FloatField(required=False, default=5.0, min_value=0.1, max_value=50)
    min_upvotes = serializers.IntegerField(required=False, default=3, min_value=0, max_value=100)
    categories = serializers.ListField(
        child=serializers.ChoiceField(choices=LocationCategory.choices),
        required=False,
        allow_empty=True,
        max_length=20,
    )


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
    media = TossMediaItemSerializer(many=True, required=False)

    def validate_media(self, value):
        if value and len(value) > MAX_TOSS_MEDIA:
            raise serializers.ValidationError(
                f"You can attach up to {MAX_TOSS_MEDIA} photos or videos."
            )
        return normalize_toss_media(value or [])


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
