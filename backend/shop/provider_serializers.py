"""Provider serializers for shop product management."""

import uuid

from django.core.files.storage import default_storage
from django.utils import timezone
from rest_framework import serializers

from .models import ProductVariant, ShopProduct, ShopProfile
from .seller_gates import can_publish_product, get_or_create_shop_profile, seller_readiness
from .serializers import ProductVariantSerializer, _absolute_media_url, _cover_image_url


class ProviderShopProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    avatar_upload = serializers.ImageField(write_only=True, required=False, allow_null=True)
    clear_avatar = serializers.BooleanField(write_only=True, required=False, default=False)
    phone_verified = serializers.SerializerMethodField()
    readiness = serializers.SerializerMethodField()

    class Meta:
        model = ShopProfile
        fields = (
            "display_name",
            "avatar",
            "avatar_upload",
            "clear_avatar",
            "region",
            "city",
            "fulfillment_notes",
            "phone",
            "phone_verified",
            "phone_verified_at",
            "payout_method",
            "payout_account_name",
            "payout_account_number",
            "payout_details_set_at",
            "readiness",
            "updated_at",
        )
        read_only_fields = (
            "phone_verified_at",
            "payout_details_set_at",
            "updated_at",
            "phone_verified",
            "readiness",
        )

    def get_avatar(self, obj) -> str | None:
        if not obj.avatar:
            return None
        request = self.context.get("request")
        try:
            return _absolute_media_url(obj.avatar.url, request)
        except Exception:
            return None

    def get_phone_verified(self, obj) -> bool:
        return bool(obj.phone_verified_at and (obj.phone or "").strip())

    def get_readiness(self, obj) -> dict:
        return seller_readiness(obj.owner)

    def update(self, instance, validated_data):
        clear = validated_data.pop("clear_avatar", False)
        upload = validated_data.pop("avatar_upload", serializers.empty)

        if "display_name" in validated_data:
            instance.display_name = (validated_data.get("display_name") or "")[:120]
        if "region" in validated_data:
            instance.region = (validated_data.get("region") or "")[:120]
        if "city" in validated_data:
            instance.city = (validated_data.get("city") or "")[:120]
        if "fulfillment_notes" in validated_data:
            instance.fulfillment_notes = (validated_data.get("fulfillment_notes") or "")[:400]

        # Changing phone clears verification until OTP succeeds again.
        if "phone" in validated_data:
            new_phone = (validated_data.get("phone") or "").strip()[:40]
            if new_phone != (instance.phone or "").strip():
                instance.phone = new_phone
                instance.phone_verified_at = None

        payout_touched = False
        for field in ("payout_method", "payout_account_name", "payout_account_number"):
            if field in validated_data:
                payout_touched = True
                value = validated_data.get(field) or ""
                setattr(instance, field, str(value).strip()[:160 if "name" in field else 80])
        if payout_touched:
            method = (instance.payout_method or "").strip()
            name = (instance.payout_account_name or "").strip()
            number = (instance.payout_account_number or "").strip()
            if method and name and number:
                instance.payout_details_set_at = timezone.now()
            else:
                instance.payout_details_set_at = None

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

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not user or not user.is_authenticated:
            return attrs

        want_active = attrs.get("is_active", getattr(self.instance, "is_active", False))
        was_active = bool(getattr(self.instance, "is_active", False))
        if not want_active:
            return attrs

        shop = get_or_create_shop_profile(user)
        from .seller_gates import (
            active_product_count,
            email_verified,
            max_active_listings,
            shop_profile_complete,
        )

        if not email_verified(user) or not shop_profile_complete(shop):
            ok, reason = can_publish_product(user, shop=shop, activating=True)
            raise serializers.ValidationError({"is_active": reason or "Cannot publish yet."})

        active = active_product_count(user)
        if was_active:
            active = max(0, active - 1)
        limit = max_active_listings(user, shop)
        if active >= limit:
            ok, reason = can_publish_product(user, shop=shop, activating=True)
            raise serializers.ValidationError({"is_active": reason or "Listing limit reached."})
        return attrs

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
        # Draft by default; validate() already blocks unauthorized publish.
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
