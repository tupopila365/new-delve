import uuid

from django.db.models import Count, Exists, OuterRef
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.business_access import (
    provider_listing_owner_ids,
    user_can_manage_booking_for_listing,
    user_can_manage_listing,
)
from accounts.permissions import IsEmailVerified, IsProviderOrBusinessMember, IsServiceProvider

from .filters import AccommodationListingFilter
from .models import (
    AccommodationBooking,
    AccommodationListing,
    AccommodationListingLike,
    BookingStatus,
)
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
        if self.action == "like":
            return [permissions.IsAuthenticated()]
        if self.action == "mine":
            return [permissions.IsAuthenticated(), IsServiceProvider()]
        return [permissions.AllowAny()]

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

        qs = AccommodationListing.objects.filter(is_active=True).select_related("owner")
        qs = qs.annotate(likes_count=Count("user_likes", distinct=True))
        if user.is_authenticated:
            qs = qs.annotate(
                liked_by_me=Exists(
                    AccommodationListingLike.objects.filter(
                        listing_id=OuterRef("pk"),
                        user_id=user.id,
                    )
                )
            )
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

    def perform_destroy(self, instance):
        instance.delete()


class AccommodationBookingViewSet(viewsets.ModelViewSet):
    serializer_class = AccommodationBookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsEmailVerified]

    def get_queryset(self):
        return AccommodationBooking.objects.filter(guest=self.request.user).select_related(
            "listing"
        )

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"])
    def mock_pay(self, request, pk=None):
        booking = self.get_object()
        if booking.guest_id != request.user.id:
            return Response({"detail": "Forbidden"}, status=403)
        if booking.status != BookingStatus.PENDING:
            return Response({"detail": "Booking not payable."}, status=400)
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
        return Response(ProviderAccommodationBookingSerializer(booking).data)


class AccommodationProviderListingViewSet(viewsets.ModelViewSet):
    """Full listing CRUD for the authenticated provider (includes inactive)."""

    serializer_class = AccommodationListingSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def get_queryset(self):
        owner_ids = provider_listing_owner_ids(self.request.user)
        return AccommodationListing.objects.filter(owner_id__in=owner_ids).select_related("owner")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        listing = self.get_object()
        if not user_can_manage_listing(self.request.user, listing.owner_id):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You cannot edit this listing.")
        serializer.save()
