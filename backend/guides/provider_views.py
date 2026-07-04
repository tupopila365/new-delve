"""Provider guide dashboard APIs (Phase 1 + Phase 9 media uploads)."""

import json

from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.business_access import (
    provider_listing_owner_ids,
    resolve_provider_listing_owner,
    user_can_manage_listing,
    user_has_listing_manager_access,
)
from accounts.permissions import IsProviderOrBusinessMember

from .models import TourGuideProfile
from .provider_serializers import ProviderGuideProfileSerializer


def _parse_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ("true", "1", "on")
    return bool(value)


def _prepare_provider_guide_data(request):
    """Normalize JSON and multipart payloads for the guide serializer."""
    content_type = request.content_type or ""
    if "multipart" in content_type:
        if hasattr(request.data, "copy"):
            data = request.data.copy()
        else:
            data = dict(request.data)
        for key in (
            "languages",
            "regions",
            "specialities",
            "certifications",
            "languages_detail",
            "portfolio_gallery",
            "tour_packages",
            "guide_stories",
        ):
            raw = data.get(key)
            if isinstance(raw, str) and raw.strip():
                try:
                    data[key] = json.loads(raw)
                except json.JSONDecodeError:
                    pass
        for key in ("licensed_guide", "is_active"):
            if key in data:
                data[key] = _parse_bool(data.get(key))
        for key in ("years_guiding", "response_hours_typical"):
            if key in data:
                try:
                    data[key] = int(data[key])
                except (TypeError, ValueError):
                    pass
        if "hourly_rate" in data and data.get("hourly_rate") == "":
            data["hourly_rate"] = None
        photo_file = request.FILES.get("photo")
        if photo_file is not None:
            data["photo_upload"] = photo_file
        if "photo" in data:
            data.pop("photo")
        return data

    data = dict(request.data)
    if "photo" in data and "photo_url" not in data and "photo_upload" not in data:
        cover = data.get("photo")
        if isinstance(cover, str) or cover is None:
            data["photo_url"] = data.pop("photo")
    return data


def _guide_for_provider(user) -> TourGuideProfile | None:
    owner_ids = provider_listing_owner_ids(user)
    return (
        TourGuideProfile.objects.filter(user_id__in=owner_ids)
        .select_related("user", "user__profile")
        .order_by("id")
        .first()
    )


class ProviderGuideProfileView(APIView):
    """GET/POST/PATCH the provider's guide profile (includes inactive)."""

    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_context(self):
        return {
            "request": self.request,
            "portfolio_images": self.request.FILES.getlist("portfolio_images"),
            "package_id": self.request.data.get("package_id") if hasattr(self.request, "data") else "",
            "package_photo": self.request.FILES.get("package_photo"),
            "package_gallery_images": self.request.FILES.getlist("package_gallery_images"),
        }

    def get(self, request):
        guide = _guide_for_provider(request.user)
        if not guide:
            return Response(None)
        return Response(ProviderGuideProfileSerializer(guide, context={"request": request}).data)

    def post(self, request):
        if not user_has_listing_manager_access(request.user):
            raise PermissionDenied("Listing management access required.")
        owner_id = resolve_provider_listing_owner(request.user)
        if TourGuideProfile.objects.filter(user_id=owner_id).exists():
            return Response({"detail": "Guide profile already exists."}, status=status.HTTP_400_BAD_REQUEST)
        data = _prepare_provider_guide_data(request)
        serializer = ProviderGuideProfileSerializer(data=data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        guide = serializer.save(user_id=owner_id)
        return Response(
            ProviderGuideProfileSerializer(guide, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request):
        guide = _guide_for_provider(request.user)
        if not guide:
            return Response({"detail": "Guide profile not found."}, status=status.HTTP_404_NOT_FOUND)
        if not user_can_manage_listing(request.user, guide.user_id):
            raise PermissionDenied("You cannot edit this listing.")
        data = _prepare_provider_guide_data(request)
        serializer = ProviderGuideProfileSerializer(
            guide,
            data=data,
            partial=True,
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        guide = serializer.save()
        return Response(ProviderGuideProfileSerializer(guide, context={"request": request}).data)
