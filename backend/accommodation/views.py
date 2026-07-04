import uuid

from django.db.models import Count, Exists, OuterRef
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.business_access import (
    provider_listing_owner_ids,
    user_can_manage_booking_for_listing,
    user_can_manage_listing,
)
from accounts.permissions import IsEmailVerified, IsProviderOrBusinessMember, IsServiceProvider
from messaging.booking_automation import notify_booking_confirmed

from .filters import AccommodationListingFilter
from .models import (
    AccommodationBooking,
    AccommodationListing,
    AccommodationListingLike,
    AccommodationListingSave,
    AccommodationQuestion,
    AccommodationReview,
    BookingStatus,
)
from .qa_serializers import (
    AccommodationAnswerCreateSerializer,
    AccommodationAnswerSerializer,
    AccommodationQuestionCreateSerializer,
    AccommodationQuestionSerializer,
    AccommodationReviewCreateSerializer,
    AccommodationReviewSerializer,
)
from .analytics_services import provider_stay_monetization_analytics
from .booking_services import listing_availability_payload
from .review_services import listing_reviews_payload
from .serializers import (
    AccommodationBookingSerializer,
    AccommodationListingSerializer,
    ProviderAccommodationBookingSerializer,
    ProviderBookingStatusSerializer,
)


class AccommodationListingViewSet(viewsets.ModelViewSet):
    queryset = AccommodationListing.objects.filter(is_active=True).select_related("owner")
    serializer_class = AccommodationListingSerializer
    filterset_class = AccommodationListingFilter
    search_fields = ("title", "description", "region", "city")
    ordering_fields = ("price_per_night", "created_at", "rating_avg")
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsServiceProvider()]
        if self.action in ("like", "save"):
            return [permissions.IsAuthenticated()]
        if self.action == "saved":
            return [permissions.IsAuthenticated()]
        if self.action == "mine":
            return [permissions.IsAuthenticated(), IsServiceProvider()]
        return [permissions.AllowAny()]

    def _annotate_engagement(self, qs, user):
        qs = qs.annotate(
            likes_count=Count("user_likes", distinct=True),
            saves_count=Count("user_saves", distinct=True),
        )
        if user.is_authenticated:
            qs = qs.annotate(
                liked_by_me=Exists(
                    AccommodationListingLike.objects.filter(
                        listing_id=OuterRef("pk"),
                        user_id=user.id,
                    )
                ),
                saved_by_me=Exists(
                    AccommodationListingSave.objects.filter(
                        listing_id=OuterRef("pk"),
                        user_id=user.id,
                    )
                ),
            )
        return qs

    def get_queryset(self):
        user = self.request.user
        mine = self.request.query_params.get("mine") == "1"

        if self.action == "mine" or mine:
            if not user.is_authenticated:
                return AccommodationListing.objects.none()
            return (
                AccommodationListing.objects.filter(owner=user)
                .select_related("owner")
                .order_by("-created_at")
            )

        if self.action == "saved":
            if not user.is_authenticated:
                return AccommodationListing.objects.none()
            qs = (
                AccommodationListing.objects.filter(is_active=True, user_saves__user=user)
                .select_related("owner")
                .distinct()
            )
            return self._annotate_engagement(qs, user)

        qs = AccommodationListing.objects.filter(is_active=True).select_related("owner")
        qs = self._annotate_engagement(qs, user)
        if self.action in ("update", "partial_update", "destroy"):
            return qs.filter(owner=user)
        return qs

    @action(detail=False, methods=["get"])
    def mine(self, request):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def like(self, request, pk=None):
        listing = self.get_object()
        like_obj, created = AccommodationListingLike.objects.get_or_create(
            listing=listing,
            user=request.user,
        )
        if not created:
            like_obj.delete()
            liked = False
        else:
            liked = True
        likes_count = AccommodationListingLike.objects.filter(listing=listing).count()
        return Response({"liked": liked, "likes_count": likes_count})

    @action(detail=True, methods=["post"])
    def save(self, request, pk=None):
        listing = self.get_object()
        save_obj, created = AccommodationListingSave.objects.get_or_create(
            listing=listing,
            user=request.user,
        )
        if not created:
            save_obj.delete()
            saved = False
        else:
            saved = True
        saves_count = AccommodationListingSave.objects.filter(listing=listing).count()
        return Response({"saved": saved, "saves_count": saves_count})

    @action(detail=False, methods=["get"])
    def saved(self, request):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def moments(self, request, pk=None):
        from social.models import Post
        from social.serializers import PostSerializer

        listing = self.get_object()
        posts = (
            Post.objects.filter(
                listing=listing,
                is_delvers=True,
                is_accommodation_story=False,
                is_hidden=False,
            )
            .select_related("author", "author__profile")
            .order_by("-created_at")[:24]
        )
        ser = PostSerializer(posts, many=True, context={"request": request})
        return Response(ser.data)

    @action(detail=True, methods=["get", "post"])
    def questions(self, request, pk=None):
        listing = self.get_object()
        if request.method == "GET":
            qs = (
                AccommodationQuestion.objects.filter(listing=listing, is_hidden=False)
                .select_related("author", "author__profile")
                .prefetch_related("answers", "answers__author", "answers__author__profile")
                .order_by("-created_at")[:50]
            )
            return Response(AccommodationQuestionSerializer(qs, many=True).data)
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        ser = AccommodationQuestionCreateSerializer(
            data=request.data,
            context={"request": request, "listing": listing},
        )
        ser.is_valid(raise_exception=True)
        question = ser.save()
        return Response(AccommodationQuestionSerializer(question).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def reviews(self, request, pk=None):
        listing = self.get_object()
        return Response(listing_reviews_payload(listing))

    @action(detail=True, methods=["get"], url_path="availability")
    def availability(self, request, pk=None):
        from datetime import datetime

        listing = self.get_object()
        check_in_raw = (request.query_params.get("check_in") or "").strip()
        check_out_raw = (request.query_params.get("check_out") or "").strip()
        room_type_name = (request.query_params.get("room") or request.query_params.get("room_type_name") or "").strip()
        try:
            guests = max(1, int(request.query_params.get("guests") or 1))
        except (TypeError, ValueError):
            guests = 1

        check_in = None
        check_out = None
        if check_in_raw and check_out_raw:
            try:
                check_in = datetime.strptime(check_in_raw, "%Y-%m-%d").date()
                check_out = datetime.strptime(check_out_raw, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"available": False, "reason": "Invalid date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(
            listing_availability_payload(
                listing,
                check_in,
                check_out,
                guests,
                room_type_name=room_type_name,
            )
        )

    def perform_destroy(self, instance):
        instance.delete()


class AccommodationBookingViewSet(viewsets.ModelViewSet):
    serializer_class = AccommodationBookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsEmailVerified]

    def get_queryset(self):
        return (
            AccommodationBooking.objects.filter(guest=self.request.user)
            .select_related("listing", "listing__owner")
            .prefetch_related("review")
        )

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        if booking.status in (BookingStatus.CANCELLED, BookingStatus.REFUNDED, BookingStatus.CHECKED_OUT):
            return Response({"detail": "Booking cannot be cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        booking.status = BookingStatus.CANCELLED
        booking.save(update_fields=["status"])
        return Response(AccommodationBookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        booking = self.get_object()
        ser = AccommodationReviewCreateSerializer(
            data=request.data,
            context={"request": request, "booking": booking},
        )
        ser.is_valid(raise_exception=True)
        review = ser.save()
        return Response(AccommodationReviewSerializer(review).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def mock_pay(self, request, pk=None):
        """Record mock payment after the host has confirmed the stay request."""
        booking = self.get_object()
        if booking.guest_id != request.user.id:
            return Response({"detail": "Forbidden"}, status=403)
        if booking.status != BookingStatus.CONFIRMED:
            return Response(
                {"detail": "Payment is available after the host confirms your stay."},
                status=400,
            )
        if booking.mock_payment_ref:
            return Response({"detail": "Payment already recorded."}, status=400)
        booking.mock_payment_ref = f"mock_{uuid.uuid4().hex[:16]}"
        booking.save(update_fields=["mock_payment_ref"])
        return Response(
            {
                "detail": "Payment successful (mock).",
                "status": booking.status,
                "mock_payment_ref": booking.mock_payment_ref,
                "booking": AccommodationBookingSerializer(booking).data,
            }
        )


class AccommodationProviderBookingViewSet(viewsets.ReadOnlyModelViewSet):
    """Provider inbox — bookings for listings the user owns or can manage."""

    serializer_class = ProviderAccommodationBookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def get_queryset(self):
        user = self.request.user
        owner_ids = provider_listing_owner_ids(user)
        owned_listing_ids = AccommodationListing.objects.filter(owner_id__in=owner_ids).values_list(
            "pk", flat=True
        )
        qs = (
            AccommodationBooking.objects.select_related("listing", "guest", "guest__profile")
            .filter(listing_id__in=owned_listing_ids)
            .order_by("-created_at")
        )
        status_filter = (self.request.query_params.get("status") or "").strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def _get_manageable_booking(self, pk):
        booking = self.get_object()
        if not user_can_manage_booking_for_listing(self.request.user, booking.listing.owner_id):
            return None
        return booking

    @action(detail=True, methods=["patch"])
    def status(self, request, pk=None):
        booking = self.get_object()
        if not user_can_manage_booking_for_listing(request.user, booking.listing.owner_id):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        ser = ProviderBookingStatusSerializer(
            data=request.data,
            context={"booking": booking},
        )
        ser.is_valid(raise_exception=True)
        booking.status = ser.validated_data["status"]
        booking.save(update_fields=["status"])
        return Response(ProviderAccommodationBookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        return self._transition(pk, BookingStatus.CONFIRMED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._transition(pk, BookingStatus.CANCELLED)

    @action(detail=True, methods=["post"])
    def check_in(self, request, pk=None):
        return self._transition(pk, BookingStatus.CHECKED_IN)

    @action(detail=True, methods=["post"])
    def check_out(self, request, pk=None):
        return self._transition(pk, BookingStatus.CHECKED_OUT)

    @action(detail=True, methods=["post"])
    def refund(self, request, pk=None):
        return self._transition(pk, BookingStatus.REFUNDED)

    def _transition(self, pk, target_status):
        booking = self.get_object()
        if not user_can_manage_booking_for_listing(self.request.user, booking.listing.owner_id):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        ser = ProviderBookingStatusSerializer(
            data={"status": target_status},
            context={"booking": booking},
        )
        ser.is_valid(raise_exception=True)
        booking.status = target_status
        booking.save(update_fields=["status"])
        if target_status == BookingStatus.CONFIRMED:
            notify_booking_confirmed(
                provider=booking.listing.owner,
                guest=booking.guest,
                booking_type="booking_stay",
                booking_id=booking.pk,
                context_label=booking.listing.title,
            )
        return Response(ProviderAccommodationBookingSerializer(booking).data)


class AccommodationProviderListingViewSet(viewsets.ModelViewSet):
    """Full listing CRUD for the authenticated provider (includes inactive)."""

    serializer_class = AccommodationListingSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def get_queryset(self):
        owner_ids = provider_listing_owner_ids(self.request.user)
        return (
            AccommodationListing.objects.filter(owner_id__in=owner_ids)
            .select_related("owner")
            .annotate(
                likes_count=Count("user_likes", distinct=True),
                saves_count=Count("user_saves", distinct=True),
            )
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        listing = self.get_object()
        if not user_can_manage_listing(self.request.user, listing.owner_id):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You cannot edit this listing.")
        serializer.save()


class AccommodationProviderAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def get(self, request):
        days_raw = request.query_params.get("days", "30")
        try:
            days = max(1, min(365, int(days_raw)))
        except (TypeError, ValueError):
            days = 30
        owner_ids = provider_listing_owner_ids(request.user)
        return Response(provider_stay_monetization_analytics(owner_ids=owner_ids, days=days))


class AccommodationQuestionAnswerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        question = (
            AccommodationQuestion.objects.select_related("listing")
            .filter(pk=pk, is_hidden=False)
            .first()
        )
        if not question:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = AccommodationAnswerCreateSerializer(
            data=request.data,
            context={"request": request, "question": question},
        )
        ser.is_valid(raise_exception=True)
        answer = ser.save()
        return Response(AccommodationAnswerSerializer(answer).data, status=status.HTTP_201_CREATED)


class AccommodationProviderQuestionsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def get(self, request):
        owner_ids = provider_listing_owner_ids(request.user)
        listing_ids = AccommodationListing.objects.filter(owner_id__in=owner_ids).values_list(
            "pk", flat=True
        )
        qs = (
            AccommodationQuestion.objects.filter(listing_id__in=listing_ids, is_hidden=False)
            .select_related("author", "author__profile", "listing")
            .prefetch_related("answers", "answers__author", "answers__author__profile")
            .order_by("-created_at")[:100]
        )
        return Response(AccommodationQuestionSerializer(qs, many=True).data)
