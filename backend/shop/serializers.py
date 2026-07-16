from django.core.files.storage import default_storage
from rest_framework import serializers

from .models import ShopProduct


def _absolute_media_url(url: str, request=None) -> str:
    text = (url or "").strip()
    if not text:
        return ""
    if text.startswith(("http://", "https://")):
        return text
    if text.startswith("/") and request:
        return request.build_absolute_uri(text)
    try:
        storage_url = default_storage.url(text)
    except Exception:
        storage_url = text if text.startswith("/") else f"/media/{text.lstrip('/')}"
    if request and storage_url.startswith("/"):
        return request.build_absolute_uri(storage_url)
    return storage_url


def _cover_image_url(obj: ShopProduct, request=None) -> str | None:
    raw = getattr(obj, "cover_image", None)
    if raw:
        url = _absolute_media_url(str(raw), request)
        if url:
            return url
    photos = obj.photos or []
    for photo in photos:
        if isinstance(photo, dict) and photo.get("is_cover") and photo.get("image"):
            return _absolute_media_url(str(photo["image"]), request) or photo["image"]
    if photos and isinstance(photos[0], dict) and photos[0].get("image"):
        return _absolute_media_url(str(photos[0]["image"]), request) or photos[0]["image"]
    return None


class ShopProductSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    owner_display_name = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    price_label = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()

    class Meta:
        model = ShopProduct
        fields = (
            "id",
            "owner_username",
            "owner_display_name",
            "name",
            "description",
            "tagline",
            "category",
            "category_label",
            "region",
            "city",
            "pickup_address",
            "price",
            "price_label",
            "price_note",
            "in_stock",
            "pickup_available",
            "lodge_delivery",
            "made_in_namibia",
            "artisan_name",
            "phone",
            "photos",
            "cover_image",
            "is_active",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "is_active")

    def get_owner_display_name(self, obj) -> str | None:
        profile = getattr(obj.owner, "profile", None)
        if profile and profile.display_name:
            return profile.display_name.strip() or None
        return None

    def get_cover_image(self, obj) -> str | None:
        return _cover_image_url(obj, self.context.get("request"))

    def get_price_label(self, obj) -> str:
        if obj.price is None:
            return ""
        base = f"N${obj.price:.2f}".rstrip("0").rstrip(".")
        note = (obj.price_note or "").strip()
        return f"{base} {note}".strip() if note else base

    def get_category_label(self, obj) -> str:
        return obj.get_category_display()
