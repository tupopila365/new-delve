import uuid

from django.db import transaction
from django.db.models import Count, Exists, F, OuterRef, Q
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.business_access import (
    business_permissions,
    provider_listing_owner_ids,
    user_can_manage_booking_for_listing,
    user_can_manage_listing,
)
from accounts.models import VerificationStatus
from accounts.listing_deals import ListingDealsContextMixin
from accounts.permissions import IsEmailVerified, IsProviderOrBusinessMember, IsServiceProvider
from messaging.booking_automation import notify_booking_confirmed

from .filters import AccommodationListingFilter
from .models import (
    AccommodationAvailability,
    AccommodationBooking,
    AccommodationListing,
    AccommodationListingLike,
    AccommodationListingSave,
    AccommodationRoomType,
    AccommodationReview,
    BookingStatus,
)
from .qa_serializers import (
    AccommodationReviewCreateSerializer,
    AccommodationReviewSerializer,
)
from .analytics_services import provider_stay_monetization_analytics
from .booking_services import (
    booking_hold_is_expired,
    expire_stale_booking_holds,
    listing_availability_payload,
    payment_hold_deadline,
)
from .review_services import listing_reviews_payload
from .serializers import (
    AccommodationAvailabilitySerializer,
    AccommodationBookingSerializer,
    AccommodationListingSerializer,
    AccommodationRoomTypeSerializer,
    ProviderAccommodationBookingSerializer,
    ProviderBookingStatusSerializer,
)


class AccommodationListingViewSet(ListingDealsContextMixin, viewsets.ModelViewSet):
    deal_category = "stays"
    deal_scope = "owner"
    queryset = (
        AccommodationListing.objects.filter(is_active=True)
        .filter(
            Q(business__isnull=True)
            | Q(business__verification_status=VerificationStatus.VERIFIED)
        )
        .select_related("owner", "owner__profile", "business")
        .prefetch_related("room_type_records")
    )
    serializer_class = AccommodationListingSerializer
    filterset_class = AccommodationListingFilter
    search_fields = ("title", "description", "region", "city", "country_code")
    ordering_fields = ("price_per_night", "created_at", "rating_avg")
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsServiceProvider()]
        if self.action in ("like", "save"):
            return [permissions.IsAuthenticated()]
        if self.action == "record_view":
            return [permissions.AllowAny()]
        if self.action == "saved":
            return [permissions.IsAuthenticated()]
        if self.action == "mine":
            return [permissions.IsAuthenticated(), IsServiceProvider()]
        if self.action == "moment_eligibility":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def _annotate_engagement(self, qs, user):
        from accounts.seller_trust import annotate_owner_verified

        qs = annotate_owner_verified(qs)
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
                .select_related("owner", "owner__profile", "business")
                .prefetch_related("room_type_records")
                .order_by("-created_at")
            )

        if self.action == "saved":
            if not user.is_authenticated:
                return AccommodationListing.objects.none()
            qs = (
                AccommodationListing.objects.filter(is_active=True, user_saves__user=user)
                .filter(
                    Q(business__isnull=True)
                    | Q(business__verification_status=VerificationStatus.VERIFIED)
                )
                .select_related("owner", "owner__profile", "business")
                .prefetch_related("room_type_records")
                .distinct()
            )
            return self._annotate_engagement(qs, user)

        qs = (
            AccommodationListing.objects.filter(is_active=True)
            .filter(
                Q(business__isnull=True)
                | Q(business__verification_status=VerificationStatus.VERIFIED)
            )
            .select_related("owner", "owner__profile", "business")
            .prefetch_related("room_type_records")
        )
        qs = self._annotate_engagement(qs, user)
        if self.action in ("update", "partial_update", "destroy"):
            return qs.filter(owner=user)
        return qs

    @action(detail=False, methods=["get"])
    def mine(self, request):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="record-view")
    def record_view(self, request, pk=None):
        """Public: record a stay listing or room page view for provider analytics."""
        from .view_tracking import record_accommodation_page_view

        listing = self.get_object()
        room_name = ""
        if isinstance(request.data, dict):
            room_name = request.data.get("room_name") or request.data.get("room") or ""
        viewer = request.user if request.user.is_authenticated else None
        recorded = record_accommodation_page_view(
            listing=listing,
            viewer=viewer,
            room_name=str(room_name),
        )
        listing.refresh_from_db(fields=["views_count"])
        return Response(
            {
                "recorded": recorded,
                "views_count": listing.views_count,
                "room_name": (str(room_name) or "").strip()[:120],
            }
        )

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
                verified_stay_booking__isnull=False,
                verified_stay_booking__status=BookingStatus.CHECKED_OUT,
                verified_stay_booking__check_out__lte=timezone.localdate(),
                verified_stay_booking__guest_id=F("author_id"),
                verified_stay_booking__listing_id=F("listing_id"),
            )
            .select_related("author", "author__profile", "verified_stay_booking")
            .order_by("-created_at")[:24]
        )
        ser = PostSerializer(posts, many=True, context={"request": request})
        return Response(ser.data)

    @action(detail=True, methods=["get"], url_path="moment-eligibility")
    def moment_eligibility(self, request, pk=None):
        from .moment_services import stay_moment_eligibility

        return Response(stay_moment_eligibility(request.user, self.get_object()))

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
        room_type_name = (
            request.query_params.get("room")
            or request.query_params.get("room_type_name")
            or ""
        ).strip()
        room_type_raw = (request.query_params.get("room_type") or "").strip()
        try:
            room_type_id = int(room_type_raw) if room_type_raw else None
        except (TypeError, ValueError):
            return Response(
                {"available": False, "reason": "Invalid room type ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )
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
                room_type_id=room_type_id,
                room_type_name=room_type_name,
            )
        )

    def perform_destroy(self, instance):
        instance.delete()


class AccommodationBookingViewSet(viewsets.ModelViewSet):
    serializer_class = AccommodationBookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsEmailVerified]

    def get_queryset(self):
        expire_stale_booking_holds()
        return (
            AccommodationBooking.objects.filter(guest=self.request.user)
            .select_related("listing", "listing__owner", "room_type")
            .prefetch_related("review")
        )

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        with transaction.atomic():
            booking = AccommodationBooking.objects.select_for_update().get(
                pk=self.get_object().pk
            )
            if booking.status in (
                BookingStatus.CANCELLED,
                BookingStatus.EXPIRED,
                BookingStatus.REFUNDED,
                BookingStatus.CHECKED_OUT,
            ):
                return Response(
                    {"detail": "Booking cannot be cancelled."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
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
        with transaction.atomic():
            booking = AccommodationBooking.objects.select_for_update().get(
                pk=self.get_object().pk
            )
            if booking.guest_id != request.user.id:
                return Response({"detail": "Forbidden"}, status=403)
            if booking.status == BookingStatus.EXPIRED:
                return Response(
                    {"detail": "This payment hold expired. Please request the stay again."},
                    status=status.HTTP_409_CONFLICT,
                )
            if booking_hold_is_expired(booking):
                booking.status = BookingStatus.EXPIRED
                booking.expired_at = timezone.now()
                booking.save(update_fields=["status", "expired_at"])
                return Response(
                    {"detail": "This payment hold expired. Please request the stay again."},
                    status=status.HTTP_409_CONFLICT,
                )
            if booking.status != BookingStatus.CONFIRMED:
                return Response(
                    {"detail": "Payment is available after the host confirms your stay."},
                    status=400,
                )
            if booking.mock_payment_ref:
                return Response({"detail": "Payment already recorded."}, status=400)
            booking.mock_payment_ref = f"mock_{uuid.uuid4().hex[:16]}"
            booking.hold_expires_at = None
            from accounts.marketplace_payout import mark_booking_payment_held

            fields = [
                "mock_payment_ref",
                "hold_expires_at",
                *mark_booking_payment_held(booking),
            ]
            booking.save(update_fields=list(dict.fromkeys(fields)))
        return Response(
            {
                "detail": "Payment successful (mock). Delve is holding funds until checkout.",
                "status": booking.status,
                "mock_payment_ref": booking.mock_payment_ref,
                "payout_status": booking.payout_status,
                "booking": AccommodationBookingSerializer(booking).data,
            }
        )


class AccommodationProviderBookingViewSet(viewsets.ReadOnlyModelViewSet):
    """Provider inbox — bookings for listings the user owns or can manage."""

    serializer_class = ProviderAccommodationBookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def get_queryset(self):
        expire_stale_booking_holds()
        user = self.request.user
        owner_ids = provider_listing_owner_ids(user)
        owned_listing_ids = AccommodationListing.objects.filter(owner_id__in=owner_ids).values_list(
            "pk", flat=True
        )
        qs = (
            AccommodationBooking.objects.select_related(
                "listing", "listing__business", "guest", "guest__profile", "room_type"
            )
            .filter(listing_id__in=owned_listing_ids)
            .order_by("-created_at")
        )
        status_filter = (self.request.query_params.get("status") or "").strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        business_raw = (self.request.query_params.get("business") or "").strip()
        if business_raw:
            try:
                business_id = int(business_raw)
            except (TypeError, ValueError):
                from rest_framework.exceptions import ValidationError

                raise ValidationError({"business": "Invalid business ID."})
            qs = qs.filter(listing__business_id=business_id)
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
        return self._transition(pk, ser.validated_data["status"])

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
        with transaction.atomic():
            base = self.get_object()
            booking = (
                AccommodationBooking.objects.select_for_update()
                .select_related("listing", "listing__owner", "guest", "guest__profile", "room_type")
                .get(pk=base.pk)
            )
            if not user_can_manage_booking_for_listing(
                self.request.user,
                booking.listing.owner_id,
            ):
                return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
            if booking.status == BookingStatus.EXPIRED:
                return Response(
                    {"detail": "This booking request has expired and no longer holds inventory."},
                    status=status.HTTP_409_CONFLICT,
                )
            if booking_hold_is_expired(booking):
                booking.status = BookingStatus.EXPIRED
                booking.expired_at = timezone.now()
                booking.save(update_fields=["status", "expired_at"])
                return Response(
                    {"detail": "This booking request has expired and no longer holds inventory."},
                    status=status.HTTP_409_CONFLICT,
                )
            ser = ProviderBookingStatusSerializer(
                data={"status": target_status},
                context={"booking": booking},
            )
            ser.is_valid(raise_exception=True)
            booking.status = target_status
            fields = ["status"]
            if target_status == BookingStatus.CONFIRMED and not booking.paid_at:
                booking.hold_expires_at = payment_hold_deadline()
                fields.append("hold_expires_at")
            from accounts.marketplace_payout import (
                mark_booking_refunded_payout,
                release_booking_payout,
            )

            if target_status == BookingStatus.CHECKED_OUT:
                fields.extend(release_booking_payout(booking))
            elif target_status == BookingStatus.REFUNDED:
                fields.extend(mark_booking_refunded_payout(booking))
            booking.save(update_fields=list(dict.fromkeys(fields)))
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
        qs = (
            AccommodationListing.objects.filter(
                Q(owner_id__in=owner_ids)
                | Q(business__owner=self.request.user)
                | Q(business__memberships__user=self.request.user)
            )
            .distinct()
            .select_related("owner", "owner__profile", "business")
            .prefetch_related("room_type_records")
            .annotate(
                likes_count=Count("user_likes", distinct=True),
                saves_count=Count("user_saves", distinct=True),
            )
        )
        business_id = self.request.query_params.get("business")
        if business_id:
            qs = qs.filter(business_id=business_id)
        return qs

    def perform_create(self, serializer):
        serializer.save()

    def _can_manage(self, listing):
        if listing.business_id:
            return business_permissions(self.request.user, listing.business)["manage_listings"]
        return user_can_manage_listing(self.request.user, listing.owner_id)

    def perform_update(self, serializer):
        listing = self.get_object()
        if not self._can_manage(listing):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You cannot edit this listing.")
        serializer.save()

    @action(detail=True, methods=["get", "post"], url_path="rooms")
    def rooms(self, request, pk=None):
        listing = self.get_object()
        if request.method == "GET":
            serializer = AccommodationRoomTypeSerializer(
                listing.room_type_records.all(),
                many=True,
                context=self.get_serializer_context(),
            )
            return Response(serializer.data)
        if not self._can_manage(listing):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        serializer = AccommodationRoomTypeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        data.pop("id", None)
        if data.get("price_per_night") is None:
            data["price_per_night"] = listing.price_per_night
        room = AccommodationRoomType.objects.create(listing=listing, **data)
        return Response(
            AccommodationRoomTypeSerializer(room).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["get", "patch", "delete"],
        url_path=r"rooms/(?P<room_id>\d+)",
    )
    def room_detail(self, request, pk=None, room_id=None):
        listing = self.get_object()
        room = listing.room_type_records.filter(pk=room_id).first()
        if room is None:
            return Response({"detail": "Room type not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.method == "GET":
            return Response(AccommodationRoomTypeSerializer(room).data)
        if not self._can_manage(listing):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        if request.method == "DELETE":
            try:
                room.delete()
            except ProtectedError:
                return Response(
                    {
                        "detail": (
                            "This room type has bookings and cannot be deleted. "
                            "Set it inactive instead."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            return Response(status=status.HTTP_204_NO_CONTENT)
        payload = request.data.copy()
        payload.pop("id", None)
        serializer = AccommodationRoomTypeSerializer(room, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["get", "put"], url_path="calendar")
    def calendar(self, request, pk=None):
        listing = self.get_object()
        if request.method == "GET":
            rows = listing.availability_calendar.select_related("room_type")
            date_from = request.query_params.get("date_from")
            date_to = request.query_params.get("date_to")
            if date_from:
                rows = rows.filter(date__gte=date_from)
            if date_to:
                rows = rows.filter(date__lte=date_to)
            return Response(AccommodationAvailabilitySerializer(rows[:500], many=True).data)

        if not self._can_manage(listing):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        payload = request.data if isinstance(request.data, dict) else {}
        target_date = payload.get("date")
        if not target_date:
            return Response({"date": "Date is required."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            listing = AccommodationListing.objects.select_for_update().get(pk=listing.pk)
            room_type_id = payload.get("room_type")
            room_type = None
            if room_type_id not in (None, ""):
                room_type = listing.room_type_records.filter(pk=room_type_id).first()
                if room_type is None:
                    return Response(
                        {"room_type": "Room type does not belong to this property."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            lookup = {"listing": listing, "room_type": room_type, "date": target_date}
            if payload.get("reset") is True:
                AccommodationAvailability.objects.filter(**lookup).delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
            serializer = AccommodationAvailabilitySerializer(data=payload)
            serializer.is_valid(raise_exception=True)
            defaults = dict(serializer.validated_data)
            defaults.pop("room_type", None)
            row, _ = AccommodationAvailability.objects.update_or_create(
                **lookup,
                defaults=defaults,
            )
            return Response(AccommodationAvailabilitySerializer(row).data)


class AccommodationProviderAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def get(self, request):
        days_raw = request.query_params.get("days", "30")
        try:
            days = max(1, min(365, int(days_raw)))
        except (TypeError, ValueError):
            days = 30
        business_raw = (request.query_params.get("business") or "").strip()
        try:
            business_id = int(business_raw) if business_raw else None
        except (TypeError, ValueError):
            return Response(
                {"detail": "Invalid business ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        owner_ids = provider_listing_owner_ids(request.user)
        return Response(
            provider_stay_monetization_analytics(
                owner_ids=owner_ids,
                days=days,
                business_id=business_id,
            )
        )
