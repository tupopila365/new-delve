"""Provider shop product APIs."""

import json

from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from accounts.business_access import (
    provider_listing_owner_ids,
    resolve_provider_listing_owner,
    user_can_manage_listing,
    user_has_listing_manager_access,
)
from accounts.permissions import IsProviderOrBusinessMember

from .models import ShopProduct
from .provider_serializers import ProviderShopProductSerializer


def _parse_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ("true", "1", "on")
    return bool(value)


def _prepare_provider_product_data(request):
    content_type = request.content_type or ""
    if "multipart" in content_type:
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
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
        if "price" in data:
            try:
                data["price"] = data["price"]
            except (TypeError, ValueError):
                pass
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
    serializer_class = ProviderShopProductSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]
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
        serializer.save(owner_id=resolve_provider_listing_owner(self.request.user))

    def perform_update(self, serializer):
        product = self.get_object()
        if not user_can_manage_listing(self.request.user, product.owner_id):
            raise PermissionDenied("You cannot edit this listing.")
        serializer.save()

    def create(self, request, *args, **kwargs):
        if not user_has_listing_manager_access(request.user):
            raise PermissionDenied("Listing management access required.")
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
