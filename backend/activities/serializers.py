from rest_framework import serializers

from common.media_urls import absolute_media_url
from common.user_display import display_name_or_username, profile_avatar_url

from .models import ActivityListing, ActivitySave


def _normalize_gallery(raw, request=None) -> list[dict]:
    items = []
    if not isinstance(raw, list):
        return items
    for row in raw:
        if isinstance(row, str) and row.strip():
            items.append({"kind": "image", "src": absolute_media_url(row, request), "caption": ""})
            continue
        if not isinstance(row, dict):
            continue
        src = (row.get("src") or row.get("url") or row.get("image") or "").strip()
        if not src:
            continue
        kind = (row.get("kind") or "image").lower()
        if kind not in ("image", "video"):
            kind = "video" if any(ext in src.lower() for ext in (".mp4", ".webm", ".mov")) else "image"
        items.append(
            {
                "kind": kind,
                "src": absolute_media_url(src, request),
                "caption": (row.get("caption") or "")[:200],
            }
        )
    return items


def _cover_from_listing(obj: ActivityListing, request=None) -> tuple[str | None, str]:
    cover = (obj.cover_image or "").strip()
    kind = (obj.cover_kind or "image").lower()
    if cover:
        return absolute_media_url(cover, request) or None, kind if kind in ("image", "video") else "image"
    gallery = _normalize_gallery(obj.media_gallery, request)
    if gallery:
        return gallery[0]["src"], gallery[0]["kind"]
    return None, "image"


class ActivityListingSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    owner_display_name = serializers.SerializerMethodField()
    owner_avatar = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    cover_kind = serializers.SerializerMethodField()
    media_gallery = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()
    price_label = serializers.SerializerMethodField()
    duration_label = serializers.SerializerMethodField()
    saved_by_me = serializers.SerializerMethodField()
    saves_count = serializers.SerializerMethodField()
    deals = serializers.SerializerMethodField()

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
            "cover_image",
            "cover_kind",
            "rating_avg",
            "rating_count",
            "saved_by_me",
            "saves_count",
            "deals",
            "is_featured",
            "is_active",
            "created_at",
        )
        read_only_fields = (
            "id",
            "created_at",
            "rating_avg",
            "rating_count",
            "saved_by_me",
            "saves_count",
            "deals",
        )

    def get_owner_display_name(self, obj) -> str:
        return display_name_or_username(obj.owner)

    def get_deals(self, obj):
        from accounts.listing_deals import deals_for_listing

        return deals_for_listing(obj, self.context, "activities")

    def get_owner_avatar(self, obj) -> str | None:
        return profile_avatar_url(obj.owner, self.context.get("request"))

    def get_cover_image(self, obj) -> str | None:
        cover, _ = _cover_from_listing(obj, self.context.get("request"))
        return cover

    def get_cover_kind(self, obj) -> str:
        _, kind = _cover_from_listing(obj, self.context.get("request"))
        return kind

    def get_media_gallery(self, obj) -> list:
        return _normalize_gallery(obj.media_gallery, self.context.get("request"))

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

    def get_saved_by_me(self, obj) -> bool:
        annotated = getattr(obj, "saved_by_me", None)
        if annotated is not None:
            return bool(annotated)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return False
        return ActivitySave.objects.filter(listing=obj, user=user).exists()

    def get_saves_count(self, obj) -> int:
        annotated = getattr(obj, "saves_count", None)
        if annotated is not None:
            return int(annotated)
        return ActivitySave.objects.filter(listing=obj).count()

