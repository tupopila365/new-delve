import uuid
from decimal import Decimal

from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accommodation.models import BookingStatus

from accounts.marketplace_payout import mark_booking_payment_held
from accounts.permissions import IsEmailVerified, IsServiceProvider

from .filters import BusTripFilter, VehicleFilter
from .models import (
    BusOperator,
    BusRoute,
    BusTrip,
    SeatReservation,
    VehicleRentalBooking,
    VehicleRentalListing,
)
from .review_serializers import (
    SeatReservationReviewCreateSerializer,
    SeatReservationReviewSerializer,
    VehicleRentalReviewCreateSerializer,
    VehicleRentalReviewSerializer,
)
from .review_services import bus_trip_reviews_payload, vehicle_reviews_payload
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
            return [permissions.IsAuthenticated(), IsServiceProvider()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        if self.action in ("update", "partial_update", "destroy"):
            return VehicleRentalListing.objects.filter(owner=self.request.user)
        qs = super().get_queryset()
        types = self.request.query_params.getlist("vehicle_type")
        if types:
            qs = qs.filter(vehicle_type__in=types)
        return qs

    @action(detail=True, methods=["get"])
    def moments(self, request, pk=None):
        from social.models import Post
        from social.serializers import PostSerializer

        listing = self.get_object()
        posts = (
            Post.objects.filter(
                vehicle_listing=listing,
                is_delvers=True,
                is_accommodation_story=False,
                is_hidden=False,
            )
            .select_related("author", "author__profile")
            .order_by("-created_at")[:24]
        )
        ser = PostSerializer(posts, many=True, context={"request": request})
        return Response(ser.data)

    @action(detail=True, methods=["get"])
    def reviews(self, request, pk=None):
        listing = self.get_object()
        return Response(vehicle_reviews_payload(listing))


class VehicleRentalBookingViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleRentalBookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsEmailVerified]

    def get_queryset(self):
        return VehicleRentalBooking.objects.filter(renter=self.request.user).select_related(
            "listing",
            "listing__owner",
            "listing__owner__profile",
        ).prefetch_related("review")

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        booking = self.get_object()
        ser = VehicleRentalReviewCreateSerializer(
            data=request.data,
            context={"request": request, "booking": booking},
        )
        ser.is_valid(raise_exception=True)
        review = ser.save()
        return Response(VehicleRentalReviewSerializer(review).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        if booking.status in (
            BookingStatus.CANCELLED,
            BookingStatus.REFUNDED,
            BookingStatus.CHECKED_IN,
            BookingStatus.CHECKED_OUT,
        ):
            return Response({"detail": "Booking cannot be cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        booking.status = BookingStatus.CANCELLED
        booking.save(update_fields=["status"])
        return Response(VehicleRentalBookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def mock_pay(self, request, pk=None):
        booking = self.get_object()
        if booking.renter_id != request.user.id:
            return Response({"detail": "Forbidden"}, status=403)
        # Stay-aligned: provider must confirm before traveller demo-pay.
        if booking.status != BookingStatus.CONFIRMED:
            return Response(
                {"detail": "Waiting for the provider to confirm this request."},
                status=400,
            )
        if booking.mock_payment_ref:
            return Response(
                {
                    "detail": "Already paid (mock).",
                    "status": booking.status,
                    "mock_payment_ref": booking.mock_payment_ref,
                }
            )
        booking.mock_payment_ref = f"mock_{uuid.uuid4().hex[:16]}"
        fields = ["mock_payment_ref", *mark_booking_payment_held(booking)]
        booking.save(update_fields=list(dict.fromkeys(fields)))
        return Response(
            {
                "detail": "Payment successful (mock). Delve is holding funds until checkout.",
                "status": booking.status,
                "mock_payment_ref": booking.mock_payment_ref,
                "payout_status": booking.payout_status,
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
    search_fields = ("route__origin", "route__destination", "route__operator__name")

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ("list", "retrieve", "moments", "reviews"):
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

    @action(detail=True, methods=["get"])
    def moments(self, request, pk=None):
        from social.models import Post
        from social.serializers import PostSerializer

        trip = self.get_object()
        posts = (
            Post.objects.filter(
                bus_trip=trip,
                is_delvers=True,
                is_accommodation_story=False,
                is_hidden=False,
            )
            .select_related("author", "author__profile")
            .order_by("-created_at")[:24]
        )
        ser = PostSerializer(posts, many=True, context={"request": request})
        return Response(ser.data)

    @action(detail=True, methods=["get"])
    def reviews(self, request, pk=None):
        trip = self.get_object()
        return Response(bus_trip_reviews_payload(trip))


class SeatReservationViewSet(viewsets.ModelViewSet):
    serializer_class = SeatReservationSerializer
    permission_classes = [permissions.IsAuthenticated, IsEmailVerified]

    def get_queryset(self):
        return SeatReservation.objects.filter(passenger=self.request.user).select_related(
            "trip",
            "trip__route",
            "trip__route__operator",
            "trip__route__operator__owner",
        ).prefetch_related("review")

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        reservation = self.get_object()
        ser = SeatReservationReviewCreateSerializer(
            data=request.data,
            context={"request": request, "reservation": reservation},
        )
        ser.is_valid(raise_exception=True)
        review = ser.save()
        return Response(SeatReservationReviewSerializer(review).data, status=status.HTTP_201_CREATED)

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
        return Response(SeatReservationSerializer(reservation).data)

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
        seat_price = trip.price or Decimal("0")
        for s in seats:
            created.append(
                SeatReservation.objects.create(
                    trip=trip,
                    passenger=request.user,
                    seat_number=s,
                    status=BookingStatus.PENDING,
                    total_price=seat_price,
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
                status=BookingStatus.CONFIRMED,
            ).select_related("trip")
        )
        if len(reservations) != len(uniq):
            return Response(
                {"detail": "Waiting for the operator to confirm these seats."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        trip_ids = {r.trip_id for r in reservations}
        if len(trip_ids) != 1:
            return Response(
                {"detail": "All reservations must be for the same trip."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if any(r.mock_payment_ref for r in reservations):
            ref = next((r.mock_payment_ref for r in reservations if r.mock_payment_ref), "")
            ser = SeatReservationSerializer(reservations, many=True, context={"request": request})
            return Response(
                {
                    "detail": "Already paid (mock).",
                    "status": BookingStatus.CONFIRMED,
                    "mock_payment_ref": ref,
                    "reservations": ser.data,
                }
            )
        ref = f"mock_{uuid.uuid4().hex[:16]}"
        for r in reservations:
            if not r.total_price:
                r.total_price = r.trip.price or Decimal("0")
            r.mock_payment_ref = ref
            fields = ["mock_payment_ref", "total_price", *mark_booking_payment_held(r)]
            r.save(update_fields=list(dict.fromkeys(fields)))
        ser = SeatReservationSerializer(reservations, many=True, context={"request": request})
        return Response(
            {
                "detail": "Payment successful (mock). Delve is holding funds until the trip is completed.",
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
        if res.status != BookingStatus.CONFIRMED:
            return Response(
                {"detail": "Waiting for the operator to confirm this seat."},
                status=400,
            )
        if res.mock_payment_ref:
            return Response(
                {
                    "detail": "Already paid (mock).",
                    "status": res.status,
                    "mock_payment_ref": res.mock_payment_ref,
                }
            )
        if not res.total_price:
            res.total_price = res.trip.price or Decimal("0")
        res.mock_payment_ref = f"mock_{uuid.uuid4().hex[:16]}"
        fields = ["mock_payment_ref", "total_price", *mark_booking_payment_held(res)]
        res.save(update_fields=list(dict.fromkeys(fields)))
        return Response(
            {
                "detail": "Payment successful (mock). Delve is holding funds until the trip is completed.",
                "status": res.status,
                "mock_payment_ref": res.mock_payment_ref,
                "payout_status": res.payout_status,
            }
        )


