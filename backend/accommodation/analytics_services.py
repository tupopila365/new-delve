from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone

from promotions.models import PromotionCampaign, PromotionStatus, PromotionTargetType

from .models import (
    AccommodationBooking,
    AccommodationListing,
    AccommodationListingLike,
    AccommodationListingSave,
    BookingStatus,
)


def _decimal_sum(value) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def provider_stay_monetization_analytics(*, owner_ids: list[int], days: int = 30) -> dict:
    since = timezone.now() - timedelta(days=max(1, days))
    listings = AccommodationListing.objects.filter(owner_id__in=owner_ids)
    listing_ids = list(listings.values_list("pk", flat=True))

    bookings = (
        AccommodationBooking.objects.filter(listing_id__in=listing_ids, created_at__gte=since)
        .exclude(status__in=[BookingStatus.CANCELLED, BookingStatus.REFUNDED])
        .select_related("listing")
    )

    paid_bookings = bookings.filter(
        status__in=[BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]
    )
    revenue_agg = paid_bookings.aggregate(total=Sum("total_price"))
    on_platform_revenue = _decimal_sum(revenue_agg["total"])

    total_likes = AccommodationListingLike.objects.filter(listing_id__in=listing_ids).count()
    total_saves = AccommodationListingSave.objects.filter(listing_id__in=listing_ids).count()

    promo_qs = PromotionCampaign.objects.filter(
        target_type=PromotionTargetType.ACCOMMODATION,
        target_id__in=[str(i) for i in listing_ids],
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

    listing_rows = []
    for listing in listings.annotate(
        likes_count=Count("user_likes", distinct=True),
        saves_count=Count("user_saves", distinct=True),
    ).order_by("-created_at")[:50]:
        listing_bookings = bookings.filter(listing_id=listing.pk)
        confirmed = listing_bookings.filter(
            status__in=[BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]
        )
        rev = confirmed.aggregate(t=Sum("total_price"))["t"]
        listing_rows.append(
            {
                "id": listing.pk,
                "title": listing.title,
                "bookings": listing_bookings.count(),
                "confirmed_bookings": confirmed.count(),
                "revenue": float(_decimal_sum(rev)),
                "likes_count": listing.likes_count,
                "saves_count": listing.saves_count,
            }
        )
    listing_rows.sort(key=lambda r: (r["revenue"], r["bookings"], r["likes_count"]), reverse=True)

    return {
        "days": days,
        "on_platform_revenue": float(on_platform_revenue),
        "total_bookings": bookings.count(),
        "confirmed_bookings": paid_bookings.count(),
        "pending_requests": bookings.filter(status=BookingStatus.PENDING).count(),
        "total_likes": total_likes,
        "total_saves": total_saves,
        "promotion_impressions": int(promo_totals["impressions"] or 0),
        "promotion_clicks": int(promo_totals["clicks"] or 0),
        "promotion_listing_opens": int(promo_totals["listing_opens"] or 0),
        "listings": listing_rows[:12],
    }
