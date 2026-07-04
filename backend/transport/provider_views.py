"""Provider transport dashboard APIs (Phase 1)."""

from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.business_access import (
    provider_listing_owner_ids,
    resolve_provider_listing_owner,
    user_can_manage_listing,
    user_has_listing_manager_access,
)
from accounts.permissions import IsProviderOrBusinessMember

from .models import BusTrip, VehicleRentalListing
from .provider_serializers import (
    ProviderBusTripListingSerializer,
    ProviderBusTripWriteSerializer,
    ProviderVehicleListingSerializer,
)


class ProviderVehicleViewSet(viewsets.ModelViewSet):
    """Fleet CRUD for provider transport admin — includes inactive listings."""

    serializer_class = ProviderVehicleListingSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        owner_ids = provider_listing_owner_ids(self.request.user)
        return VehicleRentalListing.objects.filter(owner_id__in=owner_ids).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(owner_id=resolve_provider_listing_owner(self.request.user))

    def perform_update(self, serializer):
        listing = self.get_object()
        if not user_can_manage_listing(self.request.user, listing.owner_id):
            raise PermissionDenied("You cannot edit this listing.")
        serializer.save()

    def create(self, request, *args, **kwargs):
        if not user_has_listing_manager_access(request.user):
            raise PermissionDenied("Listing management access required.")
        data = dict(request.data)
        if "cover_image" in data and "cover_image_url" not in data:
            data["cover_image_url"] = data.pop("cover_image")
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        listing = self.get_object()
        if not user_can_manage_listing(request.user, listing.owner_id):
            raise PermissionDenied("You cannot edit this listing.")
        data = dict(request.data)
        if "cover_image" in data and "cover_image_url" not in data:
            data["cover_image_url"] = data.pop("cover_image")
        serializer = self.get_serializer(listing, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


class ProviderBusTripViewSet(viewsets.ViewSet):
    """Flattened bus trip management for provider transport admin."""

    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def _owner_ids(self, request):
        return provider_listing_owner_ids(request.user)

    def _trip_queryset(self, request):
        owner_ids = self._owner_ids(request)
        return (
            BusTrip.objects.filter(route__operator__owner_id__in=owner_ids)
            .select_related("route", "route__operator")
            .prefetch_related("reservations")
            .order_by("departs_at")
        )

    def list(self, request):
        qs = self._trip_queryset(request)
        return Response(ProviderBusTripListingSerializer(qs, many=True).data)

    def create(self, request):
        if not user_has_listing_manager_access(request.user):
            raise PermissionDenied("Listing management access required.")
        ser = ProviderBusTripWriteSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        trip = ser.save()
        trip = self._trip_queryset(request).get(pk=trip.pk)
        return Response(ProviderBusTripListingSerializer(trip).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        trip = self._trip_queryset(request).filter(pk=pk).first()
        if not trip:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if not user_can_manage_listing(request.user, trip.route.operator.owner_id):
            raise PermissionDenied("You cannot edit this trip.")
        ser = ProviderBusTripWriteSerializer(
            trip,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        ser.is_valid(raise_exception=True)
        trip = ser.save()
        trip = self._trip_queryset(request).get(pk=trip.pk)
        return Response(ProviderBusTripListingSerializer(trip).data)


# Phase 1 list endpoints moved to provider_booking_views.py (ReadOnlyModelViewSet + actions).
