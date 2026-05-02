import uuid

from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsEmailVerified

from .models import GuideBooking, TourGuideProfile
from .serializers import GuideBookingSerializer, TourGuideProfileSerializer


class TourGuideProfileViewSet(viewsets.ModelViewSet):
    queryset = TourGuideProfile.objects.filter(is_active=True).select_related("user", "user__profile")
    serializer_class = TourGuideProfileSerializer
    search_fields = ("headline", "bio", "regions")
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        if self.action in ("update", "partial_update", "destroy"):
            return TourGuideProfile.objects.filter(user=self.request.user)
        return super().get_queryset()


class GuideBookingViewSet(viewsets.ModelViewSet):
    serializer_class = GuideBookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsEmailVerified]

    def get_queryset(self):
        return GuideBooking.objects.filter(client=self.request.user).select_related("guide")

    @action(detail=True, methods=["post"])
    def mock_pay(self, request, pk=None):
        b = self.get_object()
        if b.client_id != request.user.id:
            return Response({"detail": "Forbidden"}, status=403)
        if b.status != "pending":
            return Response({"detail": "Not payable."}, status=400)
        b.status = "confirmed"
        b.mock_payment_ref = f"mock_{uuid.uuid4().hex[:16]}"
        b.save(update_fields=["status", "mock_payment_ref"])
        return Response(
            {
                "detail": "Payment successful (mock).",
                "status": b.status,
                "mock_payment_ref": b.mock_payment_ref,
            }
        )
