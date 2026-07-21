"""Shop product APIs — any signed-in user may sell (own products)."""

import json
import logging
import random
import string

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.business_access import (
    provider_listing_owner_ids,
    resolve_provider_listing_owner,
    user_can_manage_listing,
)
from accounts.mail import deliver_mail

from .models import ShopProduct, ShopProfile
from .provider_serializers import ProviderShopProductSerializer, ProviderShopProfileSerializer
from .seller_gates import otp_cache_key, pop_phone_otp, store_phone_otp

logger = logging.getLogger(__name__)


def _parse_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ("true", "1", "on")
    return bool(value)


def _prepare_provider_product_data(request):
    content_type = request.content_type or ""
    if "multipart" in content_type:
        # Plain dict — not QueryDict. DRF JSONField re-stringifies QueryDict values
        # as Python repr (single quotes), which then fails "Value must be valid JSON."
        data = {key: request.data.get(key) for key in request.data.keys()}
        raw_photos = data.get("photos")
        if isinstance(raw_photos, str) and raw_photos.strip():
            try:
                data["photos"] = json.loads(raw_photos)
            except json.JSONDecodeError:
                pass
        raw_variants = data.get("variants_input")
        if isinstance(raw_variants, str) and raw_variants.strip():
            try:
                data["variants_input"] = json.loads(raw_variants)
            except json.JSONDecodeError:
                data.pop("variants_input", None)
        for key in (
            "in_stock",
            "is_featured",
            "pickup_available",
            "lodge_delivery",
            "shipping_available",
            "made_in_namibia",
            "is_active",
        ):
            if key in data:
                data[key] = _parse_bool(data.get(key))
        cover_file = request.FILES.get("cover_image_upload") or request.FILES.get("cover_image")
        if cover_file is not None:
            data["cover_image_upload"] = cover_file
        if "cover_image" in data and "cover_image_upload" not in data:
            data.pop("cover_image", None)
        return data

    data = dict(request.data)
    if "cover_image" in data and "cover_image_url" not in data and "cover_image_upload" not in data:
        cover = data.get("cover_image")
        if isinstance(cover, str):
            data["cover_image_url"] = data.pop("cover_image")
    return data


class ProviderShopProductViewSet(viewsets.ModelViewSet):
    """Shop catalog CRUD for the signed-in seller (traveller or provider)."""

    serializer_class = ProviderShopProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        owner_ids = provider_listing_owner_ids(self.request.user)
        return (
            ShopProduct.objects.filter(owner_id__in=owner_ids)
            .select_related("owner", "owner__profile")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        owner_id = resolve_provider_listing_owner(self.request.user)
        product = serializer.save(owner_id=owner_id)
        shop, created = ShopProfile.objects.get_or_create(owner_id=owner_id)
        if created or not (shop.display_name or "").strip():
            owner = product.owner
            profile = getattr(owner, "profile", None)
            fallback = (
                (getattr(profile, "display_name", None) or "").strip()
                or f"{owner.username}'s shop"
            )
            if not (shop.display_name or "").strip():
                shop.display_name = fallback[:120]
                shop.save(update_fields=["display_name", "updated_at"])
        return product

    def perform_update(self, serializer):
        product = self.get_object()
        if not user_can_manage_listing(self.request.user, product.owner_id):
            raise PermissionDenied("You cannot edit this listing.")
        serializer.save()

    def create(self, request, *args, **kwargs):
        data = _prepare_provider_product_data(request)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        product = self.get_object()
        if not user_can_manage_listing(request.user, product.owner_id):
            raise PermissionDenied("You cannot edit this listing.")
        data = _prepare_provider_product_data(request)
        serializer = self.get_serializer(product, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


class ProviderShopProfileView(APIView):
    """Seller shop profile + readiness checklist."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_or_create(self, request) -> ShopProfile:
        owner_id = resolve_provider_listing_owner(request.user)
        profile, _ = ShopProfile.objects.get_or_create(owner_id=owner_id)
        return profile

    def get(self, request):
        profile = self._get_or_create(request)
        return Response(
            ProviderShopProfileSerializer(profile, context={"request": request}).data
        )

    def patch(self, request):
        profile = self._get_or_create(request)
        if not user_can_manage_listing(request.user, profile.owner_id):
            raise PermissionDenied("You cannot edit this shop profile.")
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        if "avatar_upload" not in data and request.FILES.get("avatar"):
            data["avatar_upload"] = request.FILES["avatar"]
        if "clear_avatar" in data:
            raw = data.get("clear_avatar")
            data["clear_avatar"] = str(raw).lower() in ("1", "true", "yes", "on")
        serializer = ProviderShopProfileSerializer(
            profile, data=data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ProviderShopPhoneRequestOtpView(APIView):
    """Send a one-time code to confirm the seller phone (emailed — no ID docs)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        owner_id = resolve_provider_listing_owner(request.user)
        profile, _ = ShopProfile.objects.get_or_create(owner_id=owner_id)

        phone = (request.data.get("phone") or profile.phone or "").strip()
        if len(phone) < 7:
            return Response({"detail": "Enter a valid phone number."}, status=status.HTTP_400_BAD_REQUEST)

        profile.phone = phone[:40]
        profile.phone_verified_at = None
        profile.save(update_fields=["phone", "phone_verified_at", "updated_at"])

        code = "".join(random.choices(string.digits, k=6))
        store_phone_otp(request.user.pk, phone, code)

        email = (request.user.email or "").strip()
        if email:
            deliver_mail(
                subject="DELVE shop — confirm your phone",
                message=(
                    f"Hi {request.user.username},\n\n"
                    f"Confirm phone {phone} for your DELVE shop with this code:\n\n"
                    f"  {code}\n\n"
                    f"It expires in 10 minutes.\n"
                ),
                recipient_list=[email],
            )
        else:
            logger.warning("Shop phone OTP for user_id=%s has no email", request.user.pk)

        payload: dict = {"detail": "If your account has an email, we sent a confirmation code."}
        if settings.DEBUG:
            payload["debug_code"] = code
        return Response(payload)


class ProviderShopPhoneVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = (request.data.get("code") or "").strip()
        if not code:
            return Response({"detail": "code is required."}, status=status.HTTP_400_BAD_REQUEST)

        cached = pop_phone_otp(request.user.pk)
        if not cached or str(cached.get("code")) != code:
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

        owner_id = resolve_provider_listing_owner(request.user)
        profile, _ = ShopProfile.objects.get_or_create(owner_id=owner_id)
        profile.phone = (cached.get("phone") or profile.phone or "")[:40]
        profile.phone_verified_at = timezone.now()
        profile.save(update_fields=["phone", "phone_verified_at", "updated_at"])
        cache.delete(otp_cache_key(request.user.pk))

        return Response(
            ProviderShopProfileSerializer(profile, context={"request": request}).data
        )
