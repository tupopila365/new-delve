"""Platform admin guide profile inspector payload (Phase 5)."""

from django.db.models import Count

from accounts.models import BusinessProfile

from .models import GuideBooking, GuideSave, TourGuideProfile
from .provider_serializers import _package_title, _photo_url


def guide_profile_inspector_payload(guide_id: int, request=None) -> dict | None:
    guide = (
        TourGuideProfile.objects.select_related("user", "user__profile")
        .filter(pk=guide_id)
        .first()
    )
    if not guide:
        return None

    saves_count = GuideSave.objects.filter(guide=guide).count()
    packages = guide.tour_packages or []
    package_rows = []
    for pkg in packages:
        if not isinstance(pkg, dict):
            continue
        package_rows.append(
            {
                "id": str(pkg.get("id") or ""),
                "title": str(pkg.get("title") or "").strip() or "Untitled",
                "hours": pkg.get("hours"),
                "price": str(pkg.get("price") or ""),
            }
        )

    booking_stats = (
        GuideBooking.objects.filter(guide=guide)
        .values("status")
        .annotate(count=Count("id"))
    )
    by_status = {row["status"]: row["count"] for row in booking_stats}

    recent_bookings = list(
        GuideBooking.objects.filter(guide=guide)
        .select_related("client", "client__profile")
        .order_by("-created_at")[:5]
    )

    guest_reviews = []
    for i, review in enumerate((guide.guest_reviews or [])[:5]):
        if not isinstance(review, dict):
            continue
        guest_reviews.append(
            {
                "id": i + 1,
                "name": str(review.get("name") or "Guest"),
                "place": str(review.get("place") or ""),
                "rating": review.get("rating"),
                "body": str(review.get("body") or ""),
            }
        )

    business = (
        BusinessProfile.objects.filter(owner_id=guide.user_id)
        .order_by("id")
        .first()
    )

    display_name = getattr(guide.user.profile, "display_name", "") or guide.user.username

    return {
        "listing_type": "guide",
        "listing_id": guide.pk,
        "title": guide.headline,
        "owner_username": guide.user.username,
        "owner_display_name": display_name,
        "status": "published" if guide.is_active else "unpublished",
        "photo": _photo_url(guide, request),
        "regions": list(guide.regions or []),
        "languages": list(guide.languages or []),
        "specialities": list(guide.specialities or []),
        "hourly_rate": str(guide.hourly_rate) if guide.hourly_rate is not None else "",
        "licensed_guide": bool(guide.licensed_guide),
        "years_guiding": guide.years_guiding,
        "default_meeting_point": guide.default_meeting_point or "",
        "packages_count": len(package_rows),
        "packages": package_rows,
        "rating_avg": str(guide.rating_avg),
        "rating_count": guide.rating_count,
        "saves_count": saves_count,
        "bookings_by_status": by_status,
        "recent_bookings": [
            {
                "id": b.pk,
                "guest_username": b.client.username,
                "package_title": _package_title(guide, b.package_id),
                "date": b.date.isoformat() if b.date else "",
                "group_size": b.group_size,
                "total_price": str(b.total_price),
                "status": b.status,
            }
            for b in recent_bookings
        ],
        "guest_reviews": guest_reviews,
        "business_id": business.pk if business else None,
        "business_name": business.business_name if business else "",
        "business_verification_status": business.verification_status if business else "",
        "public_url": f"/guides/{guide.pk}",
        "created_at": guide.created_at.isoformat() if guide.created_at else "",
    }
