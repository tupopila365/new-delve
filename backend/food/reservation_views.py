"""Food table reservations — traveller requests and provider inbox (Phase 4)."""

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accommodation.models import BookingStatus
from accommodation.serializers import ProviderBookingStatusSerializer
from accounts.business_access import provider_listing_owner_ids, user_can_manage_booking_for_listing
from accounts.permissions import IsEmailVerified, IsProviderOrBusinessMember
from messaging.booking_automation import notify_booking_confirmed

from .models import FoodReservation, FoodVenue
from .reservation_serializers import (
    FoodReservationCreateSerializer,
    FoodReservationSerializer,
    ProviderFoodReservationSerializer,
)


class FoodReservationViewSet(viewsets.ModelViewSet):
    """Traveller table reservations."""

    permission_classes = [permissions.IsAuthenticated, IsEmailVerified]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return FoodReservationCreateSerializer
        return FoodReservationSerializer

    def get_queryset(self):
        return (
            FoodReservation.objects.filter(guest=self.request.user)
            .select_related("venue", "venue__owner", "venue__owner__profile")
            .order_by("-reserved_for", "-created_at")
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reservation = serializer.save()
        return Response(
            FoodReservationSerializer(reservation).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        if reservation.status in (
            BookingStatus.CANCELLED,
            BookingStatus.REFUNDED,
            BookingStatus.CHECKED_IN,
            BookingStatus.CHECKED_OUT,
        ):
            return Response({"detail": "Reservation cannot be cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        reservation.status = BookingStatus.CANCELLED
        reservation.save(update_fields=["status"])
        return Response(FoodReservationSerializer(reservation).data)


class _ProviderFoodReservationActionsMixin:
    def _check_manage(self, reservation):
        if not user_can_manage_booking_for_listing(self.request.user, reservation.venue.owner_id):
            raise PermissionDenied("You cannot manage this reservation.")

    def _transition(self, reservation, target_status):
        self._check_manage(reservation)
        ser = ProviderBookingStatusSerializer(
            data={"status": target_status},
            context={"booking": reservation},
        )
        ser.is_valid(raise_exception=True)
        reservation.status = target_status
        reservation.save(update_fields=["status"])
        if target_status == BookingStatus.CONFIRMED:
            notify_booking_confirmed(
                provider=reservation.venue.owner,
                guest=reservation.guest,
                booking_type="booking_food",
                booking_id=reservation.pk,
                context_label=reservation.venue.name,
            )
        return Response(self.get_serializer(reservation).data)

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


class ProviderFoodReservationViewSet(
    _ProviderFoodReservationActionsMixin,
    viewsets.ReadOnlyModelViewSet,
):
    serializer_class = ProviderFoodReservationSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def get_queryset(self):
        owner_ids = provider_listing_owner_ids(self.request.user)
        venue_ids = FoodVenue.objects.filter(owner_id__in=owner_ids).values_list("pk", flat=True)
        qs = (
            FoodReservation.objects.filter(venue_id__in=venue_ids)
            .select_related("venue", "guest", "guest__profile")
            .order_by("-reserved_for", "-created_at")
        )
        status_filter = (self.request.query_params.get("status") or "").strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs
