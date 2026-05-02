import uuid

from django.db.models import Count, Exists, OuterRef
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsEmailVerified

from .filters import AccommodationListingFilter
from .models import (
    AccommodationBooking,
    AccommodationListing,
    AccommodationListingLike,
    BookingStatus,
)
from .serializers import AccommodationBookingSerializer, AccommodationListingSerializer


class AccommodationListingViewSet(viewsets.ModelViewSet):
    queryset = AccommodationListing.objects.filter(is_active=True).select_related("owner")
    serializer_class = AccommodationListingSerializer
    filterset_class = AccommodationListingFilter
    search_fields = ("title", "description", "region", "city")
    ordering_fields = ("price_per_night", "created_at", "rating_avg")
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated()]
        if self.action == "like":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = AccommodationListing.objects.filter(is_active=True).select_related("owner")
        qs = qs.annotate(likes_count=Count("user_likes", distinct=True))
        user = self.request.user
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
            return qs.filter(owner=self.request.user)
        return qs

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
