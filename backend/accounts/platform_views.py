from django.contrib.auth import get_user_model
from django.db.models import Count
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accommodation.models import AccommodationBooking, AccommodationListing
from accounts.models import BusinessProfile, Profile, VerificationStatus
from accounts.permissions import IsPlatformAdmin
from accounts.serializers import BusinessProfileSerializer

User = get_user_model()


class PlatformOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        return Response(
            {
                "users": User.objects.count(),
                "providers": Profile.objects.filter(user_type="service_provider").count(),
                "businesses": BusinessProfile.objects.count(),
                "businesses_pending": BusinessProfile.objects.filter(
                    verification_status=VerificationStatus.PENDING
                ).count(),
                "listings": AccommodationListing.objects.count(),
                "bookings": AccommodationBooking.objects.count(),
                "bookings_pending": AccommodationBooking.objects.filter(status="pending").count(),
            }
        )


class PlatformUsersView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        users = (
            User.objects.select_related("profile")
            .order_by("-date_joined")[:100]
        )
        return Response(
            [
                {
                    "id": u.id,
                    "username": u.username,
                    "email": u.email,
                    "is_active": u.is_active,
                    "is_staff": u.is_staff,
                    "user_type": getattr(u.profile, "user_type", "normal"),
                    "display_name": getattr(u.profile, "display_name", ""),
                    "date_joined": u.date_joined.isoformat(),
                }
                for u in users
            ]
        )


class PlatformBusinessesView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        qs = BusinessProfile.objects.select_related("owner").annotate(
            member_count=Count("memberships")
        )
        status_filter = (request.query_params.get("status") or "").strip()
        if status_filter:
            qs = qs.filter(verification_status=status_filter)
        return Response(
            BusinessProfileSerializer(qs, many=True, context={"request": request}).data
        )


class PlatformBusinessVerificationView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, pk):
        business = BusinessProfile.objects.filter(pk=pk).first()
        if not business:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        new_status = (request.data.get("verification_status") or "").strip()
        allowed = {c[0] for c in VerificationStatus.choices}
        if new_status not in allowed:
            return Response(
                {"detail": f"verification_status must be one of: {', '.join(sorted(allowed))}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        business.verification_status = new_status
        business.save(update_fields=["verification_status", "updated_at"])
        return Response(
            BusinessProfileSerializer(business, context={"request": request}).data
        )
