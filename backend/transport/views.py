import uuid

from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accommodation.models import BookingStatus

from accounts.permissions import IsEmailVerified

from .filters import BusTripFilter, VehicleFilter
from .models import (
    BusOperator,
    BusRoute,
    BusTrip,
    SeatReservation,
    VehicleRentalBooking,
    VehicleRentalListing,
)
from .serializers import (
    BusOperatorSerializer,
    BusRouteSerializer,
    BusTripSerializer,
    SeatReservationSerializer,
    VehicleRentalBookingSerializer,
    VehicleRentalListingSerializer,
)


class VehicleRentalListingViewSet(viewsets.ModelViewSet):
    queryset = VehicleRentalListing.objects.filter(is_active=True).select_related("owner")
    serializer_class = VehicleRentalListingSerializer
    filterset_class = VehicleFilter
    search_fields = ("title", "make", "model", "region", "city")
    ordering_fields = ("price_per_day", "created_at")
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        if self.action in ("update", "partial_update", "destroy"):
            return VehicleRentalListing.objects.filter(owner=self.request.user)
        return super().get_queryset()


class VehicleRentalBookingViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleRentalBookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsEmailVerified]

    def get_queryset(self):
        return VehicleRentalBooking.objects.filter(renter=self.request.user).select_related(
            "listing"
        )

    @action(detail=True, methods=["post"])
    def mock_pay(self, request, pk=None):
        booking = self.get_object()
        if booking.renter_id != request.user.id:
            return Response({"detail": "Forbidden"}, status=403)
        if booking.status != BookingStatus.PENDING:
            return Response({"detail": "Not payable."}, status=400)
        booking.status = BookingStatus.CONFIRMED
        booking.mock_payment_ref = f"mock_{uuid.uuid4().hex[:16]}"
        booking.save(update_fields=["status", "mock_payment_ref"])
        return Response(
            {
                "detail": "Payment successful (mock).",
                "status": booking.status,
                "mock_payment_ref": booking.mock_payment_ref,
            }
        )


class BusOperatorViewSet(viewsets.ModelViewSet):
    serializer_class = BusOperatorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BusOperator.objects.filter(owner=self.request.user)


class BusRouteViewSet(viewsets.ModelViewSet):
    serializer_class = BusRouteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BusRoute.objects.filter(operator__owner=self.request.user)


class BusTripViewSet(viewsets.ModelViewSet):
    queryset = BusTrip.objects.select_related("route", "route__operator").order_by("departs_at")
    serializer_class = BusTripSerializer
    filterset_class = BusTripFilter

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ("list", "retrieve"):
            return qs.filter(is_active=True)
        return qs.filter(route__operator__owner=self.request.user)

    def perform_create(self, serializer):
        route = serializer.validated_data["route"]
        if route.operator.owner_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Not your route.")
        serializer.save()

    def perform_update(self, serializer):
        if serializer.instance.route.operator.owner_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied()
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        if instance.route.operator.owner_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied()
        super().perform_destroy(instance)


class SeatReservationViewSet(viewsets.ModelViewSet):
    serializer_class = SeatReservationSerializer
    permission_classes = [permissions.IsAuthenticated, IsEmailVerified]

    def get_queryset(self):
        return SeatReservation.objects.filter(passenger=self.request.user).select_related("trip")

    @action(detail=True, methods=["post"])
    def mock_pay(self, request, pk=None):
        res = self.get_object()
        if res.passenger_id != request.user.id:
            return Response({"detail": "Forbidden"}, status=403)
        if res.status != BookingStatus.PENDING:
            return Response({"detail": "Not payable."}, status=400)
        res.status = BookingStatus.CONFIRMED
        res.mock_payment_ref = f"mock_{uuid.uuid4().hex[:16]}"
        res.save(update_fields=["status", "mock_payment_ref"])
        return Response(
            {
                "detail": "Payment successful (mock).",
                "status": res.status,
                "mock_payment_ref": res.mock_payment_ref,
            }
        )
