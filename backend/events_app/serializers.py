from rest_framework import serializers

from common.gallery_media import media_url_kind, validate_gallery_media_list
from common.story_channels import validate_story_channels

from .access import primary_event_business
from .models import Event, EventLike, EventSave
from .ticketing_utils import event_ticketing_mode, validate_event_ticketing


def _parse_json_list_field(data, key: str):
    """Multipart form sends JSON fields as strings."""
    if not hasattr(data, "get"):
        return data
    raw = data.get(key)
    if isinstance(raw, str) and raw.strip():
        import json

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return data
        if hasattr(data, "copy"):
            data = data.copy()
        data[key] = parsed
    return data


class EventSerializer(serializers.ModelSerializer):
    organizer_username = serializers.CharField(source="organizer.username", read_only=True)
    organizer_display_name = serializers.SerializerMethodField()
    business_name = serializers.CharField(source="business.business_name", read_only=True)
    business_slug = serializers.CharField(source="business.slug", read_only=True)
    likes_count = serializers.IntegerField(read_only=True, required=False)
    saves_count = serializers.IntegerField(read_only=True, required=False)
    comments_count = serializers.IntegerField(read_only=True, required=False)
    rsvp_count = serializers.IntegerField(read_only=True, required=False)
    liked_by_me = serializers.BooleanField(read_only=True, required=False)
    saved_by_me = serializers.BooleanField(read_only=True, required=False)
    attending_by_me = serializers.BooleanField(read_only=True, required=False)
    ticketing_mode = serializers.SerializerMethodField()
    # Explicit CharField: never treat cover as ImageField/file (video covers are Cloudinary URLs).
    cover_image = serializers.CharField(required=False, allow_blank=True, max_length=2048)
    cover_kind = serializers.ChoiceField(
        choices=[("image", "Image"), ("video", "Video")],
        required=False,
    )

    class Meta:
        model = Event
        fields = (
            "id",
            "organizer",
            "organizer_username",
            "organizer_display_name",
            "business",
            "business_name",
            "business_slug",
            "title",
            "description",
            "category",
            "starts_at",
            "ends_at",
            "venue",
            "region",
            "city",
            "cover_image",
            "cover_kind",
            "gallery_images",
            "is_free",
            "price",
            "ticket_url",
            "external_ticket_clicks",
            "ticketing_mode",
            "capacity",
            "recurrence_template",
            "is_published",
            "event_stories",
            "likes_count",
            "saves_count",
            "comments_count",
            "rsvp_count",
            "liked_by_me",
            "saved_by_me",
            "attending_by_me",
            "created_at",
        )
        read_only_fields = ("organizer", "external_ticket_clicks", "comments_count", "created_at")

    def get_ticketing_mode(self, obj):
        return event_ticketing_mode(obj)

    def get_organizer_display_name(self, obj):
        profile = getattr(obj.organizer, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return obj.organizer.username

    def to_internal_value(self, data):
        data = _parse_json_list_field(data, "event_stories")
        data = _parse_json_list_field(data, "gallery_images")
        return super().to_internal_value(data)

    def validate_cover_image(self, value):
        if value is None:
            return ""
        # Multipart can surface a bare UploadedFile if a client posts a file; reject clearly.
        if hasattr(value, "read"):
            raise serializers.ValidationError(
                "Upload the cover via Cloudinary / highlights first, then send the media URL."
            )
        text = str(value).strip()
        if len(text) > 2048:
            raise serializers.ValidationError("Cover media URL is too long.")
        return text

    def validate_cover_kind(self, value):
        if value in ("image", "video"):
            return value
        raise serializers.ValidationError("cover_kind must be 'image' or 'video'.")

    def validate(self, attrs):
        is_free = attrs.get(
            "is_free",
            self.instance.is_free if self.instance is not None else False,
        )
        price = attrs.get("price", self.instance.price if self.instance else "")
        ticket_url = attrs.get("ticket_url", self.instance.ticket_url if self.instance else "")
        try:
            normalized = validate_event_ticketing(
                is_free=is_free,
                price=price or "",
                ticket_url=ticket_url or "",
                from_template=False,
            )
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        attrs.update(normalized)

        cover = attrs.get(
            "cover_image",
            self.instance.cover_image if self.instance is not None else "",
        )
        cover = (cover or "").strip()
        if "cover_image" in attrs:
            attrs["cover_image"] = cover

        kind = attrs.get("cover_kind")
        if cover:
            inferred = media_url_kind(cover)
            if kind not in ("image", "video"):
                attrs["cover_kind"] = inferred
            elif kind == "image" and inferred == "video":
                # Client may forget cover_kind on Cloudinary video URLs.
                attrs["cover_kind"] = "video"
        elif not cover and "cover_kind" not in attrs and self.instance is None:
            attrs["cover_kind"] = "image"
        return attrs

    def validate_event_stories(self, value):
        return validate_story_channels(value, field_label="Event stories")

    def validate_gallery_images(self, value):
        try:
            return validate_gallery_media_list(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def create(self, validated_data):
        user = self.context["request"].user
        if not hasattr(user, "profile") or user.profile.user_type != "service_provider":
            raise serializers.ValidationError("Only service providers can create events.")
        validated_data["organizer"] = user
        if not validated_data.get("business"):
            biz = primary_event_business(user)
            if biz:
                validated_data["business"] = biz
        return super().create(validated_data)
