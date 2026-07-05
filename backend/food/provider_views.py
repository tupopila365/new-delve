"""Provider food dashboard APIs (Phase 1)."""

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

from .models import FoodVenue
from .provider_serializers import ProviderFoodVenueSerializer


def _parse_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ("true", "1", "on")
    return bool(value)


def _prepare_provider_venue_data(request):
    """Normalize JSON and multipart payloads for the venue serializer."""
    content_type = request.content_type or ""
    if "multipart" in content_type:
        if hasattr(request.data, "copy"):
            data = request.data.copy()
        else:
            data = dict(request.data)
        for key in ("amenities", "photos", "venue_stories", "opening_hours_json"):
            raw = data.get(key)
            if isinstance(raw, str) and raw.strip():
                try:
                    data[key] = json.loads(raw)
                except json.JSONDecodeError:
                    pass
        for key in ("dine_in", "takeaway", "delivery", "reservations", "is_active"):
            if key in data:
                data[key] = _parse_bool(data.get(key))
        if "is_open" in data:
            raw = data.get("is_open")
            if isinstance(raw, str):
                if raw == "":
                    data["is_open"] = None
                else:
                    data["is_open"] = _parse_bool(raw)
        if "price_level" in data:
            try:
                data["price_level"] = int(data["price_level"])
            except (TypeError, ValueError):
                pass
        cover_file = request.FILES.get("cover_image")
        if cover_file is not None:
            data["cover_image_upload"] = cover_file
        if "cover_image" in data:
            data.pop("cover_image")
        return data

    data = dict(request.data)
    if "cover_image" in data and "cover_image_url" not in data and "cover_image_upload" not in data:
        cover = data.get("cover_image")
        if isinstance(cover, str):
            data["cover_image_url"] = data.pop("cover_image")
    return data


class ProviderFoodVenueViewSet(viewsets.ModelViewSet):
    """Venue CRUD for provider food admin — includes inactive listings."""

    serializer_class = ProviderFoodVenueSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        owner_ids = provider_listing_owner_ids(self.request.user)
        return (
            FoodVenue.objects.filter(owner_id__in=owner_ids)
            .select_related("owner", "owner__profile")
            .order_by("-created_at")
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["gallery_images"] = self.request.FILES.getlist("gallery_images")
        return context

    def perform_create(self, serializer):
        serializer.save(owner_id=resolve_provider_listing_owner(self.request.user))

    def perform_update(self, serializer):
        venue = self.get_object()
        if not user_can_manage_listing(self.request.user, venue.owner_id):
            raise PermissionDenied("You cannot edit this listing.")
        serializer.save()

    def create(self, request, *args, **kwargs):
        if not user_has_listing_manager_access(request.user):
            raise PermissionDenied("Listing management access required.")
        data = _prepare_provider_venue_data(request)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        venue = self.get_object()
        if not user_can_manage_listing(request.user, venue.owner_id):
            raise PermissionDenied("You cannot edit this listing.")
        data = _prepare_provider_venue_data(request)
        serializer = self.get_serializer(venue, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
