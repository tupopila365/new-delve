"""Provider serializers for activity listings."""

from rest_framework import serializers

from .models import ActivityListing
from .serializers import (
    _cover_from_listing,
    _normalize_gallery,
    _owner_avatar,
    _owner_display_name,
)


class ProviderActivityListingSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    owner_display_name = serializers.SerializerMethodField()
    owner_avatar = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()
    price_label = serializers.SerializerMethodField()
    duration_label = serializers.SerializerMethodField()
    cover_image_out = serializers.SerializerMethodField()
    cover_kind_out = serializers.SerializerMethodField()
    media_gallery_out = serializers.SerializerMethodField()

    class Meta:
        model = ActivityListing
        fields = (
            "id",
            "owner_username",
            "owner_display_name",
            "owner_avatar",
            "title",
            "description",
            "tagline",
            "category",
            "category_label",
            "country_code",
            "region",
            "city",
            "meeting_point",
            "duration_hours",
            "duration_label",
            "price_from",
            "currency",
            "price_note",
            "price_label",
            "max_group_size",
            "min_age",
            "languages",
            "includes",
            "excludes",
            "phone",
            "media_gallery",
            "media_gallery_out",
            "cover_image",
            "cover_image_out",
            "cover_kind",
            "cover_kind_out",
            "rating_avg",
            "rating_count",
            "is_featured",
            "is_active",
            "created_at",
        )
        read_only_fields = (
            "id",
            "created_at",
            "rating_avg",
            "rating_count",
            "owner_username",
        )
        extra_kwargs = {
            "media_gallery": {"write_only": False, "required": False},
            "cover_image": {"required": False, "allow_blank": True},
            "cover_kind": {"required": False},
        }

    def get_owner_display_name(self, obj) -> str:
        return _owner_display_name(obj.owner)

    def get_owner_avatar(self, obj) -> str | None:
        return _owner_avatar(obj.owner, self.context.get("request"))

    def get_category_label(self, obj) -> str:
        return obj.get_category_display()

    def get_price_label(self, obj) -> str:
        from decimal import Decimal

        amount = obj.price_from if obj.price_from is not None else Decimal("0")
        currency = (obj.currency or "").strip().upper()
        if currency == "NAD":
            base = f"N${amount:.2f}".rstrip("0").rstrip(".")
        elif currency:
            base = f"{currency} {amount:.2f}".rstrip("0").rstrip(".")
        else:
            base = f"{amount:.2f}".rstrip("0").rstrip(".")
        note = (obj.price_note or "").strip()
        return f"{base} {note}".strip() if note else base

    def get_duration_label(self, obj) -> str:
        hours = float(obj.duration_hours or 0)
        if hours <= 0:
            return ""
        if hours == int(hours):
            h = int(hours)
            return f"{h} hour" if h == 1 else f"{h} hours"
        return f"{hours:g} hours"

    def get_cover_image_out(self, obj) -> str | None:
        cover, _ = _cover_from_listing(obj, self.context.get("request"))
        return cover

    def get_cover_kind_out(self, obj) -> str:
        _, kind = _cover_from_listing(obj, self.context.get("request"))
        return kind

    def get_media_gallery_out(self, obj) -> list:
        return _normalize_gallery(obj.media_gallery, self.context.get("request"))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Match public serializer field names for the frontend.
        data["cover_image"] = data.pop("cover_image_out", data.get("cover_image"))
        data["cover_kind"] = data.pop("cover_kind_out", data.get("cover_kind"))
        data["media_gallery"] = data.pop("media_gallery_out", data.get("media_gallery"))
        return data

    def validate_media_gallery(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Expected a list of media items.")
        cleaned = []
        for row in value:
            if isinstance(row, str) and row.strip():
                cleaned.append({"kind": "image", "src": row.strip(), "caption": ""})
                continue
            if not isinstance(row, dict):
                continue
            src = (row.get("src") or row.get("url") or row.get("image") or "").strip()
            if not src:
                continue
            kind = (row.get("kind") or "image").lower()
            if kind not in ("image", "video"):
                kind = "image"
            cleaned.append({"kind": kind, "src": src, "caption": (row.get("caption") or "")[:200]})
        return cleaned
