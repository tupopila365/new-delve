"""Analytics, notifications, and account lifecycle helpers for platform admin."""

from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from accommodation.models import AccommodationBooking, AccommodationListing
from accounts.models import BusinessProfile, PlatformSettings, Profile, VerificationStatus
from food.models import FoodVenue
from guides.models import GuideBooking, TourGuideProfile
from social.models import Post
from transport.models import SeatReservation, VehicleRentalBooking, VehicleRentalListing

User = get_user_model()


def _date_series(days: int) -> list[str]:
    today = timezone.localdate()
    return [(today - timedelta(days=offset)).isoformat() for offset in range(days - 1, -1, -1)]


def _fill_daily_counts(raw: list[dict], days: int, *, date_key: str = "day", count_key: str = "count") -> list[dict]:
    lookup = {}
    for row in raw:
        day = row[date_key]
        if hasattr(day, "isoformat"):
            day = day.isoformat()
        lookup[str(day)] = row[count_key]
    return [{"date": d, "count": int(lookup.get(d, 0))} for d in _date_series(days)]


def platform_analytics(*, days: int = 30) -> dict:
    days = max(7, min(days, 90))
    since = timezone.now() - timedelta(days=days)

    signup_rows = (
        User.objects.filter(date_joined__gte=since)
        .annotate(day=TruncDate("date_joined"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )

    acc_rows = (
        AccommodationBooking.objects.filter(created_at__gte=since)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"))
    )
    guide_rows = (
        GuideBooking.objects.filter(created_at__gte=since)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"))
    )
    vehicle_rows = (
        VehicleRentalBooking.objects.filter(created_at__gte=since)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"))
    )
    bus_rows = (
        SeatReservation.objects.filter(created_at__gte=since)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"))
    )

    def merge_bookings(*row_sets: list[dict]) -> list[dict]:
        totals: dict[str, int] = {}
        for rows in row_sets:
            for row in rows:
                day = row["day"]
                if hasattr(day, "isoformat"):
                    day = day.isoformat()
                totals[str(day)] = totals.get(str(day), 0) + row["count"]
        return [{"date": d, "count": totals.get(d, 0)} for d in _date_series(days)]

    verification_funnel = {
        "unverified": BusinessProfile.objects.filter(verification_status=VerificationStatus.UNVERIFIED).count(),
        "pending": BusinessProfile.objects.filter(verification_status=VerificationStatus.PENDING).count(),
        "verified": BusinessProfile.objects.filter(verification_status=VerificationStatus.VERIFIED).count(),
        "rejected": BusinessProfile.objects.filter(
            verification_status__in=[VerificationStatus.REJECTED, VerificationStatus.SUSPENDED]
        ).count(),
    }

    bookings_by_vertical = {
        "stays": AccommodationBooking.objects.filter(created_at__gte=since).count(),
        "guides": GuideBooking.objects.filter(created_at__gte=since).count(),
        "transport": VehicleRentalBooking.objects.filter(created_at__gte=since).count()
        + SeatReservation.objects.filter(created_at__gte=since).count(),
    }

    return {
        "days": days,
        "signups": _fill_daily_counts(list(signup_rows), days),
        "bookings": merge_bookings(list(acc_rows), list(guide_rows), list(vehicle_rows), list(bus_rows)),
        "bookings_by_vertical": bookings_by_vertical,
        "verification_funnel": verification_funnel,
        "totals": {
            "signups": sum(p["count"] for p in _fill_daily_counts(list(signup_rows), days)),
            "bookings": sum(bookings_by_vertical.values()),
        },
    }


def admin_notifications() -> list[dict]:
    from reports.models import Report, ReportSeverity, ReportStatus

    items: list[dict] = []

    critical = Report.objects.filter(
        severity=ReportSeverity.CRITICAL,
        status__in=[ReportStatus.NEW, ReportStatus.UNDER_REVIEW, ReportStatus.ESCALATED],
    ).count()
    if critical:
        items.append(
            {
                "id": "critical-reports",
                "level": "critical",
                "title": f"{critical} critical report{'s' if critical != 1 else ''}",
                "message": "Safety or fraud reports need immediate review.",
                "action_to": "/admin/reports",
            }
        )

    pending_verify = BusinessProfile.objects.filter(verification_status=VerificationStatus.PENDING).count()
    if pending_verify:
        items.append(
            {
                "id": "pending-verifications",
                "level": "high",
                "title": f"{pending_verify} pending verification{'s' if pending_verify != 1 else ''}",
                "message": "Businesses waiting for document review.",
                "action_to": "/admin/verifications",
            }
        )

    open_reports = Report.objects.filter(status__in=[ReportStatus.NEW, ReportStatus.ESCALATED]).count()
    if open_reports:
        items.append(
            {
                "id": "open-reports",
                "level": "medium",
                "title": f"{open_reports} open report{'s' if open_reports != 1 else ''}",
                "message": "New or escalated traveller reports.",
                "action_to": "/admin/reports",
            }
        )

    unverified_email = Profile.objects.filter(email_verified=False).count()
    if unverified_email:
        items.append(
            {
                "id": "unverified-email",
                "level": "low",
                "title": f"{unverified_email} unverified email{'s' if unverified_email != 1 else ''}",
                "message": "Accounts that have not confirmed their email.",
                "action_to": "/admin/email-verification",
            }
        )

    return items


def serialize_platform_settings(settings: PlatformSettings) -> dict:
    return {
        "feature_flags": settings.feature_flags,
        "announcement_title": settings.announcement_title,
        "announcement_body": settings.announcement_body,
        "announcement_active": settings.announcement_active,
        "updated_at": settings.updated_at.isoformat(),
        "updated_by_username": settings.updated_by.username if settings.updated_by else None,
    }


def anonymize_user_account(user: User, *, actor: User) -> None:
    if user.is_staff:
        raise ValueError("Staff accounts cannot be deleted via this flow.")
    if user.pk == actor.pk:
        raise ValueError("You cannot delete your own account.")

    Post.objects.filter(author=user).update(is_hidden=True, body="[deleted]", moderation_reason="Account deleted")
    AccommodationListing.objects.filter(owner=user).update(is_active=False)
    TourGuideProfile.objects.filter(user=user).update(is_active=False)
    VehicleRentalListing.objects.filter(owner=user).update(is_active=False)
    FoodVenue.objects.filter(owner=user).update(is_active=False)

    profile = user.profile
    profile.display_name = "Deleted user"
    profile.bio = ""
    profile.avatar = None
    profile.region = ""
    profile.city = ""
    profile.email_verified = False
    profile.is_private = True
    profile.show_in_search = False
    profile.save()

    tombstone = f"deleted_{user.pk}"
    user.username = tombstone
    user.email = f"{tombstone}@deleted.delve"
    user.first_name = ""
    user.last_name = ""
    user.is_active = False
    user.set_unusable_password()
    user.save()
