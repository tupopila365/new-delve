"""Platform admin CRUD for purchasable promotion packages."""

from __future__ import annotations

import re

from django.utils.text import slugify
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsPlatformAdmin
from accounts.platform_audit import log_admin_action
from promotions.models import PromotionPlacement, PromotionProduct
from promotions.payment_services import format_money
from promotions.provider_services import PROVIDER_PLACEMENT_VALUES


def _default_description(placement: str) -> str:
    return {
        PromotionPlacement.HOMEPAGE_STAYS: "Featured on the Delve homepage stays rail",
        PromotionPlacement.HOMEPAGE_GUIDES: "Featured on the homepage guides rail",
        PromotionPlacement.HOMEPAGE_FOOD: "Featured on the homepage food rail",
        PromotionPlacement.HOMEPAGE_EVENTS: "Featured on the homepage events rail",
        PromotionPlacement.HOMEPAGE_TRANSPORT: "Featured on the homepage transport rail",
        PromotionPlacement.CATEGORY_SPOTLIGHT: "Hero spotlight on the category list",
        PromotionPlacement.DELVERS_FEED: "Sponsored slot in the Delvers feed",
        PromotionPlacement.COMMUNITY_FEED: "Sponsored slot in the community feed",
    }.get(placement, "Featured placement across Delve")


def suggest_product_slug(*, placement: str, duration_days: int, region: str) -> str:
    slug_region = slugify(region) or "national"
    base = f"{placement}_{int(duration_days)}d_{slug_region}"
    candidate = base[:80]
    if not PromotionProduct.objects.filter(slug=candidate).exists():
        return candidate
    for i in range(2, 50):
        suffix = f"-{i}"
        candidate = f"{base[: 80 - len(suffix)]}{suffix}"
        if not PromotionProduct.objects.filter(slug=candidate).exists():
            return candidate
    return f"{base[:70]}-{PromotionProduct.objects.count() + 1}"


def serialize_admin_product(product: PromotionProduct) -> dict:
    return {
        "id": product.id,
        "slug": product.slug,
        "name": product.name,
        "description": product.description or _default_description(product.placement),
        "placement": product.placement,
        "placement_label": product.get_placement_display(),
        "region": product.region,
        "duration_days": product.duration_days,
        "price_cents": product.price_cents,
        "price_display": format_money(product.price_cents, product.currency),
        "currency": product.currency,
        "is_active": product.is_active,
        "is_provider_purchasable": product.placement in PROVIDER_PLACEMENT_VALUES,
        "created_at": product.created_at,
        "updated_at": product.updated_at,
    }


class PlatformPromotionProductSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    placement = serializers.ChoiceField(choices=PromotionPlacement.choices)
    region = serializers.CharField(max_length=120, required=False, allow_blank=True)
    duration_days = serializers.IntegerField(min_value=1, max_value=365)
    price_cents = serializers.IntegerField(min_value=0)
    currency = serializers.CharField(max_length=8, required=False, default="NAD")
    slug = serializers.SlugField(max_length=80, required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate_currency(self, value: str) -> str:
        v = (value or "NAD").strip().upper()
        if not re.fullmatch(r"[A-Z]{3}", v):
            raise serializers.ValidationError("Use a 3-letter currency code.")
        return v

    def validate_slug(self, value: str) -> str:
        return (value or "").strip().lower()

    def validate(self, attrs):
        instance: PromotionProduct | None = getattr(self, "instance", None)
        slug = (attrs.get("slug") or "").strip()
        if not slug:
            placement = attrs.get("placement") or (instance.placement if instance else "")
            duration = attrs.get("duration_days")
            if duration is None and instance:
                duration = instance.duration_days
            region = attrs.get("region")
            if region is None and instance:
                region = instance.region
            attrs["slug"] = suggest_product_slug(
                placement=placement,
                duration_days=int(duration or 7),
                region=(region or "").strip(),
            )
        else:
            qs = PromotionProduct.objects.filter(slug__iexact=slug)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"slug": "Slug is already in use."})
        attrs["region"] = (attrs.get("region") or "").strip()
        placement = attrs.get("placement") or (instance.placement if instance else "")
        desc = (attrs.get("description") or "").strip() if "description" in attrs or not instance else None
        if desc is None and instance:
            pass
        elif not desc:
            attrs["description"] = _default_description(placement)
        else:
            attrs["description"] = desc
        return attrs


class PlatformPromotionProductsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        qs = PromotionProduct.objects.all().order_by("placement", "region", "duration_days", "name")
        placement = (request.query_params.get("placement") or "").strip()
        active = (request.query_params.get("active") or "").strip().lower()
        if placement:
            qs = qs.filter(placement=placement)
        if active in ("1", "true", "yes"):
            qs = qs.filter(is_active=True)
        elif active in ("0", "false", "no"):
            qs = qs.filter(is_active=False)
        return Response([serialize_admin_product(p) for p in qs])

    def post(self, request):
        ser = PlatformPromotionProductSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        product = PromotionProduct.objects.create(
            slug=data["slug"],
            name=data["name"].strip(),
            description=data.get("description") or "",
            placement=data["placement"],
            region=data.get("region") or "",
            duration_days=data["duration_days"],
            price_cents=data["price_cents"],
            currency=data.get("currency") or "NAD",
            is_active=data.get("is_active", True),
        )
        log_admin_action(
            actor=request.user,
            action="promotion_product_create",
            target_type="promotion_product",
            target_id=str(product.pk),
            detail=product.name,
        )
        return Response(serialize_admin_product(product), status=status.HTTP_201_CREATED)


class PlatformPromotionProductDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, pk):
        product = PromotionProduct.objects.filter(pk=pk).first()
        if not product:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        # Partial update — merge current values for omitted fields.
        payload = {
            "name": request.data.get("name", product.name),
            "description": request.data.get("description", product.description),
            "placement": request.data.get("placement", product.placement),
            "region": request.data.get("region", product.region),
            "duration_days": request.data.get("duration_days", product.duration_days),
            "price_cents": request.data.get("price_cents", product.price_cents),
            "currency": request.data.get("currency", product.currency),
            "slug": request.data.get("slug", product.slug),
            "is_active": request.data.get("is_active", product.is_active),
        }
        ser = PlatformPromotionProductSerializer(instance=product, data=payload)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        product.slug = data["slug"]
        product.name = data["name"].strip()
        product.description = data.get("description") or ""
        product.placement = data["placement"]
        product.region = data.get("region") or ""
        product.duration_days = data["duration_days"]
        product.price_cents = data["price_cents"]
        product.currency = data.get("currency") or "NAD"
        product.is_active = bool(data.get("is_active", True))
        product.save()
        log_admin_action(
            actor=request.user,
            action="promotion_product_update",
            target_type="promotion_product",
            target_id=str(product.pk),
            detail=product.name,
        )
        return Response(serialize_admin_product(product))

    def delete(self, request, pk):
        product = PromotionProduct.objects.filter(pk=pk).first()
        if not product:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        # Soft-delete: deactivate so historical campaigns keep their FK.
        product.is_active = False
        product.save(update_fields=["is_active", "updated_at"])
        log_admin_action(
            actor=request.user,
            action="promotion_product_deactivate",
            target_type="promotion_product",
            target_id=str(product.pk),
            detail=product.name,
        )
        return Response(serialize_admin_product(product))
