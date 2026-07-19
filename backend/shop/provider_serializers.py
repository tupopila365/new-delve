"""Provider serializers for shop product management."""

import uuid

from django.core.files.storage import default_storage
from rest_framework import serializers

from .models import ProductVariant, ShopProduct, ShopProfile
from .serializers import ProductVariantSerializer, _absolute_media_url, _cover_image_url


class ProviderShopProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    avatar_upload = serializers.ImageField(write_only=True, required=False, allow_null=True)
    clear_avatar = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = ShopProfile
        fields = ("display_name", "avatar", "avatar_upload", "clear_avatar", "updated_at")
        read_only_fields = ("updated_at",)

    def get_avatar(self, obj) -> str | None:
        if not obj.avatar:
            return None
        request = self.context.get("request")
        try:
            return _absolute_media_url(obj.avatar.url, request)
        except Exception:
            return None

    def update(self, instance, validated_data):
        clear = validated_data.pop("clear_avatar", False)
        upload = validated_data.pop("avatar_upload", serializers.empty)
        if "display_name" in validated_data:
            instance.display_name = (validated_data.get("display_name") or "")[:120]
        if clear:
            if instance.avatar:
                instance.avatar.delete(save=False)
            instance.avatar = None
        elif upload is not serializers.empty and upload is not None:
            if instance.avatar:
                instance.avatar.delete(save=False)
            instance.avatar = upload
        instance.save()
        return instance


class ProviderShopProductSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    cover_image = serializers.SerializerMethodField()
    cover_image_upload = serializers.ImageField(write_only=True, required=False, allow_null=True)
    cover_image_url = serializers.CharField(write_only=True, required=False, allow_blank=True)
    price_label = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()
    variants = ProductVariantSerializer(many=True, read_only=True)
    variants_input = serializers.JSONField(write_only=True, required=False)

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
            "sku",
            "stock_quantity",
            "in_stock",
            "is_featured",
            "pickup_available",
            "lodge_delivery",
            "shipping_available",
            "shipping_fee",
            "made_in_namibia",
            "artisan_name",
            "phone",
            "photos",
            "cover_image",
            "cover_image_upload",
            "cover_image_url",
            "variants",
            "variants_input",
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

    def _sync_variants(self, product, rows):
        if rows is None or not isinstance(rows, list):
            return
        product.variants.all().delete()
        for row in rows:
            label = str(row.get("label", "")).strip()
            if not label:
                continue
            price_override = row.get("price_override")
            try:
                price_override = None if price_override in (None, "") else price_override
            except Exception:
                price_override = None
            ProductVariant.objects.create(
                product=product,
                label=label[:120],
                price_override=price_override,
                stock_quantity=int(row.get("stock_quantity") or 0),
                sku=str(row.get("sku", "")).strip()[:64],
            )

    def create(self, validated_data):
        upload = validated_data.pop("cover_image_upload", None)
        url = validated_data.pop("cover_image_url", None)
        variants = validated_data.pop("variants_input", None)
        if upload is not None:
            validated_data["cover_image"] = self._store_upload(upload)
        elif url:
            validated_data["cover_image"] = url.strip()
        product = super().create(validated_data)
        self._sync_variants(product, variants)
        return product

    def update(self, instance, validated_data):
        upload = validated_data.pop("cover_image_upload", None)
        url = validated_data.pop("cover_image_url", None)
        variants = validated_data.pop("variants_input", None)
        if upload is not None:
            validated_data["cover_image"] = self._store_upload(upload)
        elif url is not None and url != "":
            validated_data["cover_image"] = url.strip()
        product = super().update(instance, validated_data)
        self._sync_variants(product, variants)
        return product
