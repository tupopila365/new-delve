import os

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import EmailVerificationToken, PlatformBookingNote
from accounts.permissions import IsPlatformAdmin
from accounts.platform_audit import log_admin_action
from accounts.platform_marketplace import (
    get_platform_booking_detail,
    list_platform_bookings,
    list_platform_listings,
    list_unverified_email_users,
    set_listing_published,
)

User = get_user_model()


class PlatformListingsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        search = (request.query_params.get("search") or "").strip()
        listing_type = (request.query_params.get("type") or request.query_params.get("listing_type") or "").strip()
        status_filter = (request.query_params.get("status") or "").strip()
        limit = min(int(request.query_params.get("limit") or 200), 300)
        return Response(
            list_platform_listings(
                search=search,
                listing_type=listing_type,
                status=status_filter,
                limit=limit,
            )
        )

    def patch(self, request):
        listing_type = (request.data.get("listing_type") or "").strip()
        listing_id = request.data.get("listing_id")
        published = request.data.get("published")
        reason = (request.data.get("reason") or "").strip()

        if not listing_type or listing_id is None or published is None:
            return Response(
                {"detail": "listing_type, listing_id, and published are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            row = set_listing_published(
                listing_type,
                int(listing_id),
                published=bool(published),
                reason=reason,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        action = "listing_publish" if published else "listing_unpublish"
        log_admin_action(
            actor=request.user,
            action=action,
            target_type="listing",
            target_id=f"{listing_type}:{listing_id}",
            detail=reason or row["title"],
        )
        return Response(row)


class PlatformBookingsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        search = (request.query_params.get("search") or "").strip()
        booking_type = (request.query_params.get("type") or request.query_params.get("booking_type") or "").strip()
        status_filter = (request.query_params.get("status") or "").strip()
        limit = min(int(request.query_params.get("limit") or 200), 300)
        return Response(
            list_platform_bookings(
                search=search,
                booking_type=booking_type,
                status=status_filter,
                limit=limit,
            )
        )


class PlatformBookingDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request, booking_type, booking_id):
        detail = get_platform_booking_detail(booking_type, int(booking_id))
        if not detail:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(detail)

    def patch(self, request, booking_type, booking_id):
        note = (request.data.get("note") or request.data.get("dispute_note") or "").strip()
        new_status = (request.data.get("status") or "").strip()
        pk = int(booking_id)
        bt = booking_type.strip().lower()

        if note:
            PlatformBookingNote.objects.create(
                booking_type=bt,
                booking_id=pk,
                author=request.user,
                body=note,
            )
            log_admin_action(
                actor=request.user,
                action="booking_note",
                target_type="booking",
                target_id=f"{bt}:{pk}",
                detail=note[:200],
            )

        if new_status:
            updated = _update_booking_status(bt, pk, new_status)
            if not updated:
                return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)
            log_admin_action(
                actor=request.user,
                action="booking_status",
                target_type="booking",
                target_id=f"{bt}:{pk}",
                detail=new_status,
            )

        if not note and not new_status:
            return Response(
                {"detail": "Provide note and/or status to update."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        detail = get_platform_booking_detail(bt, pk)
        if not detail:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(detail)


def _update_booking_status(booking_type: str, booking_id: int, new_status: str) -> bool:
    from accommodation.models import AccommodationBooking
    from guides.models import GuideBooking
    from transport.models import SeatReservation, VehicleRentalBooking
    from events_app.models import EventBooking

    if booking_type == "accommodation":
        obj = AccommodationBooking.objects.filter(pk=booking_id).first()
    elif booking_type == "guide":
        obj = GuideBooking.objects.filter(pk=booking_id).first()
    elif booking_type == "vehicle":
        obj = VehicleRentalBooking.objects.filter(pk=booking_id).first()
    elif booking_type == "bus_seat":
        obj = SeatReservation.objects.filter(pk=booking_id).first()
    elif booking_type == "event":
        obj = EventBooking.objects.filter(pk=booking_id).first()
    else:
        return False

    if not obj:
        return False
    obj.status = new_status
    obj.save(update_fields=["status"])
    return True


class PlatformEmailVerificationView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        search = (request.query_params.get("search") or "").strip()
        limit = min(int(request.query_params.get("limit") or 100), 200)
        return Response(list_unverified_email_users(search=search, limit=limit))

    def patch(self, request, pk):
        user = User.objects.select_related("profile").filter(pk=pk).first()
        if not user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        action = (request.data.get("action") or "").strip().lower()
        if action not in ("verify", "resend"):
            return Response(
                {"detail": "action must be verify or resend."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = user.profile
        if action == "verify":
            profile.email_verified = True
            profile.save(update_fields=["email_verified", "updated_at"])
            log_admin_action(
                actor=request.user,
                action="email_verify_manual",
                target_type="user",
                target_id=user.pk,
                detail=f"@{user.username}",
            )
            return Response(
                {
                    "id": user.pk,
                    "username": user.username,
                    "email": user.email,
                    "email_verified": True,
                    "detail": "Email marked as verified.",
                }
            )

        token = EmailVerificationToken.create_for_user(user)
        frontend = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        link = f"{frontend}/verify-email?token={token.token}"
        send_mail(
            subject="Verify your DELVE account",
            message=f"Hi {user.username},\n\nVerify your email: {link}\n\nToken: {token.token}",
            from_email=None,
            recipient_list=[user.email],
            fail_silently=True,
        )
        log_admin_action(
            actor=request.user,
            action="email_verify_resend",
            target_type="user",
            target_id=user.pk,
            detail=f"@{user.username}",
        )
        return Response(
            {
                "id": user.pk,
                "username": user.username,
                "email": user.email,
                "email_verified": profile.email_verified,
                "detail": "Verification email sent.",
            }
        )
