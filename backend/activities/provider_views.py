"""Provider CRUD for activity listings."""

import json

from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from accounts.business_access import (
    provider_listing_owner_ids,
    resolve_provider_listing_owner,
    user_can_manage_listing,
)

from .models import ActivityListing
from .provider_serializers import ProviderActivityListingSerializer


def _parse_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ("true", "1", "on", "yes")
    return bool(value)


def _prepare_activity_data(request):
    content_type = request.content_type or ""
    if "multipart" in content_type:
        data = {key: request.data.get(key) for key in request.data.keys()}
        for json_key in ("media_gallery", "languages", "includes", "excludes"):
            raw = data.get(json_key)
            if isinstance(raw, str) and raw.strip():
                try:
                    data[json_key] = json.loads(raw)
                except json.JSONDecodeError:
                    pass
        for key in ("is_active", "is_featured"):
            if key in data:
                data[key] = _parse_bool(data.get(key))
        return data

    data = dict(request.data)
    return data


class ProviderActivityListingViewSet(viewsets.ModelViewSet):
    serializer_class = ProviderActivityListingSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        owner_ids = provider_listing_owner_ids(self.request.user)
        return ActivityListing.objects.filter(owner_id__in=owner_ids).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(owner_id=resolve_provider_listing_owner(self.request.user))

    def create(self, request, *args, **kwargs):
        data = _prepare_activity_data(request)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        listing = self.get_object()
        if not user_can_manage_listing(request.user, listing.owner_id):
            raise PermissionDenied("You cannot edit this listing.")
        data = _prepare_activity_data(request)
        serializer = self.get_serializer(listing, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
