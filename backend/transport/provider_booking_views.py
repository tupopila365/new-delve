"""Provider transport booking operations (Phase 2)."""

from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accommodation.models import BookingStatus
from accommodation.serializers import ProviderBookingStatusSerializer

from accounts.business_access import provider_listing_owner_ids, user_can_manage_booking_for_listing
from accounts.permissions import IsProviderOrBusinessMember

from .models import SeatReservation, VehicleRentalBooking, VehicleRentalListing
from .provider_serializers import ProviderRentalBookingSerializer, ProviderSeatBookingSerializer


class _ProviderBookingActionsMixin:
    """Shared confirm / cancel / check-in transitions for transport bookings."""

    def _check_manage(self, booking):
        owner_id = self._listing_owner_id(booking)
        if not user_can_manage_booking_for_listing(self.request.user, owner_id):
            raise PermissionDenied("You cannot manage this booking.")

    def _listing_owner_id(self, booking):
        raise NotImplementedError

    def _transition(self, booking, target_status):
        self._check_manage(booking)
        ser = ProviderBookingStatusSerializer(
            data={"status": target_status},
            context={"booking": booking},
        )
        ser.is_valid(raise_exception=True)
        booking.status = target_status
        booking.save(update_fields=["status"])
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        return self._transition(self.get_object(), BookingStatus.CONFIRMED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._transition(self.get_object(), BookingStatus.CANCELLED)

    @action(detail=True, methods=["post"])
    def check_in(self, request, pk=None):
        return self._transition(self.get_object(), BookingStatus.CHECKED_IN)

    @action(detail=True, methods=["post"])
    def check_out(self, request, pk=None):
        return self._transition(self.get_object(), BookingStatus.CHECKED_OUT)

    @action(detail=True, methods=["post"])
    def refund(self, request, pk=None):
        return self._transition(self.get_object(), BookingStatus.REFUNDED)


class ProviderRentalBookingViewSet(_ProviderBookingActionsMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = ProviderRentalBookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def _listing_owner_id(self, booking):
        return booking.listing.owner_id

    def get_queryset(self):
        owner_ids = provider_listing_owner_ids(self.request.user)
        listing_ids = VehicleRentalListing.objects.filter(owner_id__in=owner_ids).values_list("pk", flat=True)
        qs = (
            VehicleRentalBooking.objects.filter(listing_id__in=listing_ids)
            .select_related("listing", "renter", "renter__profile")
            .order_by("-created_at")
        )
        status_filter = (self.request.query_params.get("status") or "").strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class ProviderSeatBookingViewSet(_ProviderBookingActionsMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = ProviderSeatBookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def _listing_owner_id(self, booking):
        return booking.trip.route.operator.owner_id

    def get_queryset(self):
        owner_ids = provider_listing_owner_ids(self.request.user)
        qs = (
            SeatReservation.objects.filter(trip__route__operator__owner_id__in=owner_ids)
            .select_related("trip", "trip__route", "trip__route__operator", "passenger", "passenger__profile")
            .order_by("-created_at")
        )
        status_filter = (self.request.query_params.get("status") or "").strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs
