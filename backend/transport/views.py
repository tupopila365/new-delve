import uuid

from django.db import transaction
from django.db.models import Prefetch
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.business_access import user_can_manage_listing

from accommodation.models import BookingStatus

from accounts.permissions import IsEmailVerified, IsServiceProvider

from .filters import BusTripFilter, VehicleFilter
from .models import (
    BusOperator,
    BusRoute,
    BusTrip,
    BusTripAnswer,
    BusTripQuestion,
    SeatReservation,
    VehicleAnswer,
    VehicleQuestion,
    VehicleRentalBooking,
    VehicleRentalListing,
)
from .qa_serializers import (
    BusTripAnswerCreateSerializer,
    BusTripAnswerSerializer,
    BusTripQuestionCreateSerializer,
    BusTripQuestionSerializer,
    VehicleAnswerCreateSerializer,
    VehicleAnswerSerializer,
    VehicleQuestionCreateSerializer,
    VehicleQuestionSerializer,
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

    @action(detail=True, methods=["get", "post"])
    def questions(self, request, pk=None):
        listing = self.get_object()
        if request.method == "GET":
            visible_answers = VehicleAnswer.objects.filter(is_hidden=False).select_related(
                "author", "author__profile"
            )
            qs = (
                VehicleQuestion.objects.filter(listing=listing, is_hidden=False)
                .select_related("author", "author__profile", "listing")
                .prefetch_related(Prefetch("answers", queryset=visible_answers))
                .order_by("-created_at")[:50]
            )
            return Response(VehicleQuestionSerializer(qs, many=True).data)
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        ser = VehicleQuestionCreateSerializer(
            data=request.data,
            context={"request": request, "listing": listing},
        )
        ser.is_valid(raise_exception=True)
        question = ser.save()
        return Response(VehicleQuestionSerializer(question).data, status=status.HTTP_201_CREATED)

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
        if self.action in ("list", "retrieve", "moments", "reviews", "questions"):
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

    @action(detail=True, methods=["get", "post"])
    def questions(self, request, pk=None):
        trip = self.get_object()
        if request.method == "GET":
            visible_answers = BusTripAnswer.objects.filter(is_hidden=False).select_related(
                "author", "author__profile"
            )
            qs = (
                BusTripQuestion.objects.filter(trip=trip, is_hidden=False)
                .select_related("author", "author__profile", "trip", "trip__route")
                .prefetch_related(Prefetch("answers", queryset=visible_answers))
                .order_by("-created_at")[:50]
            )
            return Response(BusTripQuestionSerializer(qs, many=True).data)
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        ser = BusTripQuestionCreateSerializer(
            data=request.data,
            context={"request": request, "trip": trip},
        )
        ser.is_valid(raise_exception=True)
        question = ser.save()
        return Response(BusTripQuestionSerializer(question).data, status=status.HTTP_201_CREATED)

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


class VehicleQuestionAnswerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        question = (
            VehicleQuestion.objects.select_related("listing")
            .filter(pk=pk, is_hidden=False)
            .first()
        )
        if not question:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if not user_can_manage_listing(request.user, question.listing.owner_id):
            raise PermissionDenied("You cannot answer questions for this listing.")
        ser = VehicleAnswerCreateSerializer(
            data=request.data,
            context={"request": request, "question": question},
        )
        ser.is_valid(raise_exception=True)
        answer = ser.save()
        return Response(VehicleAnswerSerializer(answer).data, status=status.HTTP_201_CREATED)


class BusTripQuestionAnswerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        question = (
            BusTripQuestion.objects.select_related("trip", "trip__route", "trip__route__operator")
            .filter(pk=pk, is_hidden=False)
            .first()
        )
        if not question:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        owner_id = question.trip.route.operator.owner_id
        if not user_can_manage_listing(request.user, owner_id):
            raise PermissionDenied("You cannot answer questions for this trip.")
        ser = BusTripAnswerCreateSerializer(
            data=request.data,
            context={"request": request, "question": question},
        )
        ser.is_valid(raise_exception=True)
        answer = ser.save()
        return Response(BusTripAnswerSerializer(answer).data, status=status.HTTP_201_CREATED)
