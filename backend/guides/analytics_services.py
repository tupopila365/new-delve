"""Provider guide dashboard analytics (Phase 4)."""

from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone

from promotions.models import PromotionCampaign, PromotionStatus, PromotionTargetType

from .models import GuideBooking, GuideSave, TourGuideProfile

ACTIVE_BOOKING_STATUSES = ("pending", "confirmed", "completed")
REVENUE_STATUSES = ("confirmed", "completed")


def provider_guide_analytics(*, owner_ids: list[int], days: int = 30) -> dict:
    since = timezone.now() - timedelta(days=max(1, days))
    profiles = TourGuideProfile.objects.filter(user_id__in=owner_ids)
    guide_ids = list(profiles.values_list("pk", flat=True))

    bookings = GuideBooking.objects.filter(
        guide_id__in=guide_ids,
        created_at__gte=since,
    ).exclude(status__in=["cancelled", "refunded"])

    revenue_qs = bookings.filter(status__in=REVENUE_STATUSES)
    revenue_total = revenue_qs.aggregate(total=Sum("total_price"))["total"] or Decimal("0")

    total_saves = GuideSave.objects.filter(guide_id__in=guide_ids).count()

    promo_qs = PromotionCampaign.objects.filter(
        target_type=PromotionTargetType.GUIDE,
        target_id__in=[str(i) for i in guide_ids],
    ).exclude(
        status__in=[
            PromotionStatus.CANCELLED,
            PromotionStatus.REJECTED,
            PromotionStatus.PENDING_PAYMENT,
            PromotionStatus.REFUNDED,
        ]
    )
    promo_totals = promo_qs.aggregate(
        impressions=Sum("impressions"),
        clicks=Sum("clicks"),
        listing_opens=Sum("listing_opens"),
    )

    profile_rows = []
    for profile in profiles.annotate(saves_count=Count("user_saves", distinct=True)).order_by("-created_at")[:20]:
        profile_bookings = bookings.filter(guide_id=profile.pk)
        profile_revenue = profile_bookings.filter(status__in=REVENUE_STATUSES).aggregate(
            total=Sum("total_price")
        )["total"] or Decimal("0")
        profile_rows.append(
            {
                "id": profile.pk,
                "headline": profile.headline,
                "bookings": profile_bookings.count(),
                "confirmed_bookings": profile_bookings.filter(
                    status__in=["confirmed", "completed"]
                ).count(),
                "completed_tours": profile_bookings.filter(status="completed").count(),
                "saves_count": profile.saves_count,
                "revenue": f"{profile_revenue:.2f}",
                "rating_avg": float(profile.rating_avg or 0),
                "rating_count": int(profile.rating_count or 0),
                "packages_count": len(profile.tour_packages or []),
                "is_active": profile.is_active,
            }
        )
    profile_rows.sort(
        key=lambda r: (r["bookings"], r["saves_count"], r["rating_count"]),
        reverse=True,
    )

    rating_avg = 0.0
    rating_count = 0
    if profiles.exists():
        # Weighted average across owned profiles.
        total_weight = 0
        weighted = 0.0
        for profile in profiles:
            count = int(profile.rating_count or 0)
            if count <= 0:
                continue
            weighted += float(profile.rating_avg or 0) * count
            total_weight += count
        if total_weight:
            rating_avg = round(weighted / total_weight, 2)
            rating_count = total_weight

    return {
        "days": days,
        "total_bookings": bookings.count(),
        "confirmed_bookings": bookings.filter(status__in=["confirmed", "completed"]).count(),
        "completed_tours": bookings.filter(status="completed").count(),
        "pending_requests": bookings.filter(status="pending").count(),
        "revenue": f"{revenue_total:.2f}",
        "total_saves": total_saves,
        "rating_avg": rating_avg,
        "rating_count": rating_count,
        "promotion_impressions": int(promo_totals["impressions"] or 0),
        "promotion_clicks": int(promo_totals["clicks"] or 0),
        "promotion_listing_opens": int(promo_totals["listing_opens"] or 0),
        "profiles": profile_rows[:12],
    }
