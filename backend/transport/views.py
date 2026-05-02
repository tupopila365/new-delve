import uuid

from django.db import transaction
from rest_framework import permissions, status, viewsets
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
    queryset = VehicleRentalListing.objects.filter(is_active=True).select_related(
        "owner",
        "owner__profile",
    )
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
        qs = super().get_queryset()
        types = self.request.query_params.getlist("vehicle_type")
        if types:
            qs = qs.filter(vehicle_type__in=types)
        return qs


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

    def create(self, request, *args, **kwargs):
        if request.data.get("seat_numbers") is not None:
            return self._create_group(request)
        return super().create(request, *args, **kwargs)

    @transaction.atomic
    def _create_group(self, request):
        trip_id = request.data.get("trip")
        seat_numbers = request.data.get("seat_numbers")
        if trip_id is None or not isinstance(seat_numbers, list):
            return Response(
                {"detail": "Provide trip and seat_numbers (list)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            trip = BusTrip.objects.select_for_update().get(pk=trip_id, is_active=True)
        except BusTrip.DoesNotExist:
            return Response({"detail": "Trip not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            seats = sorted(int(s) for s in seat_numbers)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid seat numbers."}, status=status.HTTP_400_BAD_REQUEST)
        if len(seats) < 1 or len(seats) > 4:
            return Response({"detail": "Book 1 to 4 seats."}, status=status.HTTP_400_BAD_REQUEST)
        if len(set(seats)) != len(seats):
            return Response({"detail": "Duplicate seats."}, status=status.HTTP_400_BAD_REQUEST)
        for s in seats:
            if s < 1 or s > trip.total_seats:
                return Response({"detail": "Invalid seat number."}, status=status.HTTP_400_BAD_REQUEST)
        for i in range(len(seats) - 1):
            if seats[i + 1] != seats[i] + 1:
                return Response(
                    {"detail": "Seats must be adjacent (one block)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        taken = SeatReservation.objects.filter(
            trip=trip,
            status__in=[BookingStatus.PENDING, BookingStatus.CONFIRMED],
            seat_number__in=seats,
        ).exists()
        if taken:
            return Response(
                {"detail": "One or more seats are no longer available."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = []
        for s in seats:
            created.append(
                SeatReservation.objects.create(
                    trip=trip,
                    passenger=request.user,
                    seat_number=s,
                    status=BookingStatus.PENDING,
                )
            )
        ser = SeatReservationSerializer(created, many=True, context={"request": request})
        total = trip.price * len(seats)
        return Response(
            {
                "reservations": ser.data,
                "total_price": str(total),
                "seat_count": len(seats),
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="bulk-mock-pay")
    def bulk_mock_pay(self, request):
        ids = request.data.get("reservation_ids")
        if not isinstance(ids, list) or not ids:
            return Response(
                {"detail": "reservation_ids required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        uniq = list({int(i) for i in ids})
        reservations = list(
            SeatReservation.objects.filter(
                id__in=uniq,
                passenger=request.user,
                status=BookingStatus.PENDING,
            ).select_related("trip")
        )
        if len(reservations) != len(uniq):
            return Response(
                {"detail": "Invalid or non-pending reservations."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        trip_ids = {r.trip_id for r in reservations}
        if len(trip_ids) != 1:
            return Response(
                {"detail": "All reservations must be for the same trip."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ref = f"mock_{uuid.uuid4().hex[:16]}"
        for r in reservations:
            r.status = BookingStatus.CONFIRMED
            r.mock_payment_ref = ref
            r.save(update_fields=["status", "mock_payment_ref"])
        ser = SeatReservationSerializer(reservations, many=True, context={"request": request})
        return Response(
            {
                "detail": "Payment successful (mock).",
                "status": BookingStatus.CONFIRMED,
                "mock_payment_ref": ref,
                "reservations": ser.data,
            }
        )

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
