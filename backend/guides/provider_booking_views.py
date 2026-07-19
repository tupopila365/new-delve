"""Provider guide booking inbox and status actions (Phase 1)."""

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.business_access import (
    provider_listing_owner_ids,
    user_can_manage_booking_for_listing,
)
from accounts.permissions import IsProviderOrBusinessMember
from messaging.booking_automation import notify_booking_confirmed

from .models import GuideBooking, TourGuideProfile
from .provider_serializers import ProviderGuideBookingSerializer

# Guide booking status machine (string statuses on GuideBooking.status).
ALLOWED_TRANSITIONS = {
    "pending": {"confirmed", "cancelled"},
    "confirmed": {"completed", "cancelled", "refunded"},
    "completed": set(),
    "cancelled": set(),
    "refunded": set(),
}

ACTION_STATUS = {
    "confirm": "confirmed",
    "cancel": "cancelled",
    "complete": "completed",
    "refund": "refunded",
}


class ProviderGuideBookingViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProviderGuideBookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        owner_ids = provider_listing_owner_ids(self.request.user)
        guide_ids = TourGuideProfile.objects.filter(user_id__in=owner_ids).values_list("pk", flat=True)
        qs = (
            GuideBooking.objects.filter(guide_id__in=guide_ids)
            .select_related("guide", "client", "client__profile")
            .order_by("-created_at")
        )
        status_filter = (self.request.query_params.get("status") or "").strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def _transition(self, booking: GuideBooking, action_name: str):
        if not user_can_manage_booking_for_listing(self.request.user, booking.guide.user_id):
            raise PermissionDenied("You cannot manage this booking.")
        target = ACTION_STATUS.get(action_name)
        if not target:
            return Response({"detail": "Unknown action."}, status=status.HTTP_400_BAD_REQUEST)
        current = (booking.status or "pending").strip()
        allowed = ALLOWED_TRANSITIONS.get(current, set())
        if target not in allowed:
            return Response(
                {"detail": f"Cannot {action_name} a booking with status '{current}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        booking.status = target
        fields = ["status"]
        from accounts.marketplace_payout import mark_booking_refunded_payout, release_booking_payout

        if target == "completed":
            fields.extend(release_booking_payout(booking))
        elif target == "refunded":
            fields.extend(mark_booking_refunded_payout(booking))
        booking.save(update_fields=list(dict.fromkeys(fields)))
        if target == "confirmed":
            notify_booking_confirmed(
                provider=booking.guide.user,
                guest=booking.client,
                booking_type="booking_guide",
                booking_id=booking.pk,
                context_label=booking.guide.headline or booking.guide.user.username,
            )
        return Response(ProviderGuideBookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        return self._transition(self.get_object(), "confirm")

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._transition(self.get_object(), "cancel")

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        return self._transition(self.get_object(), "complete")

    @action(detail=True, methods=["post"])
    def refund(self, request, pk=None):
        return self._transition(self.get_object(), "refund")
