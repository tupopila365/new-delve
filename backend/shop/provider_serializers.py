"""Provider serializers for shop product management."""

import uuid

from django.core.files.storage import default_storage
from rest_framework import serializers

from .models import ShopProduct
from .serializers import _absolute_media_url, _cover_image_url


class ProviderShopProductSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    cover_image = serializers.SerializerMethodField()
    cover_image_upload = serializers.ImageField(write_only=True, required=False, allow_null=True)
    cover_image_url = serializers.CharField(write_only=True, required=False, allow_blank=True)
    price_label = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()

    class Meta:
        model = ShopProduct
        fields = (
            "id",
            "owner_username",
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
            "cover_image_upload",
            "cover_image_url",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

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

    def _store_upload(self, uploaded) -> str:
        ext = (uploaded.name or "").rsplit(".", 1)[-1].lower() or "jpg"
        path = f"shop/covers/{uuid.uuid4().hex}.{ext}"
        saved = default_storage.save(path, uploaded)
        return default_storage.url(saved)

    def create(self, validated_data):
        upload = validated_data.pop("cover_image_upload", None)
        url = validated_data.pop("cover_image_url", None)
        if upload is not None:
            validated_data["cover_image"] = self._store_upload(upload)
        elif url:
            validated_data["cover_image"] = url.strip()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        upload = validated_data.pop("cover_image_upload", None)
        url = validated_data.pop("cover_image_url", None)
        if upload is not None:
            validated_data["cover_image"] = self._store_upload(upload)
        elif url is not None and url != "":
            validated_data["cover_image"] = url.strip()
        return super().update(instance, validated_data)
