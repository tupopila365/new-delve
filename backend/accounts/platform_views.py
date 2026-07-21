from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accommodation.models import AccommodationBooking, AccommodationListing
from accounts.models import (
    AdminAuditLog,
    BusinessProfile,
    BusinessVerificationDocument,
    Profile,
    VerificationDocumentStatus,
    VerificationStatus,
)
from accounts.permissions import IsPlatformAdmin
from accounts.platform_audit import audit_activity_text, audit_activity_type, log_admin_action
from accounts.serializers import BusinessProfileSerializer, BusinessVerificationDocumentSerializer
from events_app.models import Event
from food.models import FoodReservation, FoodVenue
from guides.models import GuideBooking, TourGuideProfile
from social.models import Post
from transport.models import BusTrip, SeatReservation, VehicleRentalBooking, VehicleRentalListing

User = get_user_model()


def _pending_booking_q():
    return Q(status="pending") | Q(status="requested")


class PlatformOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        listings_stays = AccommodationListing.objects.filter(is_active=True).count()
        listings_guides = TourGuideProfile.objects.filter(is_active=True).count()
        listings_transport = (
            VehicleRentalListing.objects.filter(is_active=True).count()
            + BusTrip.objects.filter(is_active=True, departs_at__gte=timezone.now()).count()
        )
        listings_food = FoodVenue.objects.filter(is_active=True).count()
        listings_events = Event.objects.filter(is_published=True).count()
        listings_posts = Post.objects.filter(is_hidden=False, is_accommodation_story=False).count()
        listings_total = (
            listings_stays + listings_guides + listings_transport + listings_food + listings_events + listings_posts
        )

        bookings_stays = AccommodationBooking.objects.count()
        bookings_guides = GuideBooking.objects.count()
        bookings_transport = VehicleRentalBooking.objects.count() + SeatReservation.objects.count()
        bookings_food = FoodReservation.objects.count()
        bookings_total = bookings_stays + bookings_guides + bookings_transport + bookings_food

        pending_stays = AccommodationBooking.objects.filter(_pending_booking_q()).count()
        pending_guides = GuideBooking.objects.filter(status="pending").count()
        pending_transport = (
            VehicleRentalBooking.objects.filter(status="pending").count()
            + SeatReservation.objects.filter(status="pending").count()
        )
        pending_food = FoodReservation.objects.filter(status="pending").count()

        users_unverified_email = Profile.objects.filter(email_verified=False).count()

        return Response(
            {
                "users": User.objects.count(),
                "providers": Profile.objects.filter(user_type="service_provider").count(),
                "businesses": BusinessProfile.objects.count(),
                "businesses_pending": BusinessProfile.objects.filter(
                    verification_status=VerificationStatus.PENDING
                ).count(),
                "listings": listings_total,
                "listings_stays": listings_stays,
                "listings_guides": listings_guides,
                "listings_transport": listings_transport,
                "listings_food": listings_food,
                "listings_events": listings_events,
                "listings_posts": listings_posts,
                "bookings": bookings_total,
                "bookings_pending": pending_stays + pending_guides + pending_transport + pending_food,
                "bookings_stays": bookings_stays,
                "bookings_guides": bookings_guides,
                "bookings_transport": bookings_transport,
                "bookings_food": bookings_food,
                "reports_open": _open_reports_count(),
                "users_unverified_email": users_unverified_email,
            }
        )


def _open_reports_count() -> int:
    try:
        from reports.models import Report, ReportStatus

        return Report.objects.filter(
            status__in=[ReportStatus.NEW, ReportStatus.UNDER_REVIEW, ReportStatus.ESCALATED]
        ).count()
    except Exception:
        return 0


class PlatformActivityView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        limit = min(int(request.query_params.get("limit") or 50), 100)
        since_raw = (request.query_params.get("since") or "").strip()
        qs = AdminAuditLog.objects.select_related("actor").order_by("-created_at")
        if since_raw:
            since_dt = parse_datetime(since_raw)
            if since_dt:
                qs = qs.filter(created_at__gt=since_dt)
        entries = qs[:limit]
        return Response(
            [
                {
                    "id": e.id,
                    "text": audit_activity_text(e),
                    "time": _relative_time(e.created_at),
                    "type": audit_activity_type(e),
                    "action": e.action,
                    "created_at": e.created_at.isoformat(),
                }
                for e in entries
            ]
        )


def _relative_time(dt):
    delta = timezone.now() - dt
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return "Just now"
    if seconds < 3600:
        return f"{seconds // 60} min ago"
    if seconds < 86400:
        return f"{seconds // 3600}h ago"
    return f"{seconds // 86400}d ago"


class PlatformUsersView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        search = (request.query_params.get("search") or "").strip().lower()
        qs = User.objects.select_related("profile").order_by("-date_joined")
        if search:
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(profile__display_name__icontains=search)
            )
        users = qs[:200]
        return Response([_serialize_platform_user(u) for u in users])


class PlatformUserDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request, pk):
        user = User.objects.select_related("profile").filter(pk=pk).first()
        if not user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        data = _serialize_platform_user(user)
        data["businesses_count"] = BusinessProfile.objects.filter(owner=user).count()
        return Response(data)


class PlatformUserProfileView(APIView):
    """360° admin inspector — aggregated user footprint."""

    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request, pk):
        from accounts.admin_user_profile import build_admin_user_profile

        user = User.objects.select_related("profile").filter(pk=pk).first()
        if not user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(build_admin_user_profile(user, request))


class PlatformUserUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, pk):
        user = User.objects.select_related("profile").filter(pk=pk).first()
        if not user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if user.pk == request.user.pk and request.data.get("is_active") is False:
            return Response(
                {"detail": "You cannot suspend your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        changes = []
        if "is_active" in request.data:
            active = bool(request.data["is_active"])
            if user.is_active != active:
                user.is_active = active
                changes.append("reactivated" if active else "suspended")
                log_admin_action(
                    actor=request.user,
                    action="user_activate" if active else "user_suspend",
                    target_type="user",
                    target_id=user.pk,
                    detail=f"@{user.username}",
                )

        if "is_staff" in request.data:
            staff = bool(request.data["is_staff"])
            if user.is_staff != staff:
                user.is_staff = staff
                changes.append("promoted staff" if staff else "demoted staff")
                log_admin_action(
                    actor=request.user,
                    action="user_promote_staff" if staff else "user_demote_staff",
                    target_type="user",
                    target_id=user.pk,
                    detail=f"@{user.username}",
                )

        if changes:
            user.save()

        return Response(_serialize_platform_user(user))


def _serialize_platform_user(u):
    profile = getattr(u, "profile", None)
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "is_active": u.is_active,
        "is_staff": u.is_staff,
        "user_type": getattr(profile, "user_type", "normal"),
        "display_name": getattr(profile, "display_name", ""),
        "date_joined": u.date_joined.isoformat(),
        "email_verified": getattr(profile, "email_verified", False),
        "region": getattr(profile, "region", ""),
        "city": getattr(profile, "city", ""),
    }


class PlatformBusinessesView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        qs = BusinessProfile.objects.select_related("owner").annotate(
            member_count=Count("memberships"),
            document_count=Count("verification_documents"),
        )
        status_filter = (request.query_params.get("status") or "").strip()
        if status_filter:
            qs = qs.filter(verification_status=status_filter)
        data = BusinessProfileSerializer(qs, many=True, context={"request": request}).data
        doc_counts = {
            b.id: b.document_count
            for b in qs
        }
        notes = {b.id: b.verification_notes for b in qs}
        for row in data:
            row["document_count"] = doc_counts.get(row["id"], 0)
            row["verification_notes"] = notes.get(row["id"], "")
        return Response(data)


class PlatformBusinessDocumentsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request, pk):
        business = BusinessProfile.objects.filter(pk=pk).select_related("owner").first()
        if not business:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        docs = business.verification_documents.all()
        return Response(
            {
                "business": BusinessProfileSerializer(business, context={"request": request}).data,
                "documents": BusinessVerificationDocumentSerializer(
                    docs, many=True, context={"request": request}
                ).data,
            }
        )


class PlatformBusinessVerificationView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, pk):
        business = (
            BusinessProfile.objects.select_related("owner").filter(pk=pk).first()
        )
        if not business:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = (request.data.get("verification_status") or "").strip()
        reason = (request.data.get("reason") or request.data.get("verification_notes") or "").strip()
        allowed = {c[0] for c in VerificationStatus.choices}
        if new_status not in allowed:
            return Response(
                {"detail": f"verification_status must be one of: {', '.join(sorted(allowed))}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status in (VerificationStatus.REJECTED, VerificationStatus.SUSPENDED) and not reason:
            return Response(
                {"detail": "A reason is required when rejecting or suspending a business."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = business.verification_status
        business.verification_status = new_status
        if reason:
            business.verification_notes = reason
        business.save(update_fields=["verification_status", "verification_notes", "updated_at"])

        if new_status == VerificationStatus.VERIFIED:
            business.verification_documents.filter(
                status=VerificationDocumentStatus.PENDING
            ).update(status=VerificationDocumentStatus.APPROVED)
        elif new_status in (VerificationStatus.REJECTED, VerificationStatus.SUSPENDED):
            business.verification_documents.filter(
                status=VerificationDocumentStatus.PENDING
            ).update(status=VerificationDocumentStatus.REJECTED, notes=reason)

        log_admin_action(
            actor=request.user,
            action="business_verify",
            target_type="business",
            target_id=business.pk,
            detail=f"{business.business_name}: {old_status} → {new_status}. {reason}".strip(),
        )

        email_sent = False
        email_recipient = ""
        if old_status != new_status:
            from accounts.mail import send_business_verification_status_email

            email_sent = send_business_verification_status_email(business, request=request)
            owner = business.owner
            if owner and (owner.email or "").strip():
                email_recipient = owner.email.strip()

        data = BusinessProfileSerializer(business, context={"request": request}).data
        data["email_sent"] = email_sent
        data["email_recipient"] = email_recipient if email_sent else ""
        if old_status != new_status and not email_sent:
            data["email_detail"] = (
                "Status saved, but no email was sent — the owner has no email on file "
                "or SMTP failed. Check API logs and EMAIL_* / FRONTEND_URL settings."
            )
        elif email_sent:
            data["email_detail"] = f"Provider notified at {email_recipient}."
        else:
            data["email_detail"] = "Status unchanged — no email sent."
        return Response(data)
