from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from promotions.models import PromotionCampaign, PromotionStatus, PromotionTargetType

from .models import (
    AccommodationBooking,
    AccommodationListing,
    AccommodationListingLike,
    AccommodationListingSave,
    AccommodationPageView,
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

    page_views = AccommodationPageView.objects.filter(listing_id__in=listing_ids, created_at__gte=since)
    listing_views_qs = page_views.filter(room_name="")
    room_views_qs = page_views.exclude(room_name="")
    total_listing_views = listing_views_qs.count()
    total_room_views = room_views_qs.count()

    views_by_listing = {
        row["listing_id"]: row["c"]
        for row in listing_views_qs.values("listing_id").annotate(c=Count("id"))
    }
    room_views_by_listing: dict[int, list[dict]] = {}
    for row in (
        room_views_qs.values("listing_id", "room_name")
        .annotate(c=Count("id"))
        .order_by("listing_id", "-c")
    ):
        room_views_by_listing.setdefault(row["listing_id"], []).append(
            {"name": row["room_name"], "views": row["c"]}
        )

    day_rows = (
        page_views.annotate(day=TruncDate("created_at"))
        .values("day", "room_name")
        .annotate(c=Count("id"))
        .order_by("day")
    )
    views_trend_map: dict[str, dict[str, int]] = {}
    for row in day_rows:
        day = row["day"]
        if day is None:
            continue
        key = day.isoformat()
        bucket = views_trend_map.setdefault(key, {"listing_views": 0, "room_views": 0})
        if row["room_name"]:
            bucket["room_views"] += row["c"]
        else:
            bucket["listing_views"] += row["c"]
    views_trend = [
        {
            "date": day,
            "listing_views": vals["listing_views"],
            "room_views": vals["room_views"],
            "views": vals["listing_views"] + vals["room_views"],
        }
        for day, vals in sorted(views_trend_map.items())
    ]

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
        period_listing_views = views_by_listing.get(listing.pk, 0)
        room_rows = room_views_by_listing.get(listing.pk, [])[:8]
        period_room_views = sum(r["views"] for r in room_rows)
        listing_rows.append(
            {
                "id": listing.pk,
                "title": listing.title,
                "bookings": listing_bookings.count(),
                "confirmed_bookings": confirmed.count(),
                "revenue": float(_decimal_sum(rev)),
                "likes_count": listing.likes_count,
                "saves_count": listing.saves_count,
                "views": period_listing_views,
                "listing_views": period_listing_views,
                "room_views": period_room_views,
                "views_count": listing.views_count,
                "rooms": room_rows,
            }
        )
    listing_rows.sort(
        key=lambda r: (r["revenue"], r["listing_views"] + r["room_views"], r["bookings"], r["likes_count"]),
        reverse=True,
    )

    return {
        "days": days,
        "on_platform_revenue": float(on_platform_revenue),
        "total_bookings": bookings.count(),
        "confirmed_bookings": paid_bookings.count(),
        "pending_requests": bookings.filter(status=BookingStatus.PENDING).count(),
        "total_likes": total_likes,
        "total_saves": total_saves,
        "total_listing_views": total_listing_views,
        "total_room_views": total_room_views,
        "total_views": total_listing_views + total_room_views,
        "views_trend": views_trend,
        "promotion_impressions": int(promo_totals["impressions"] or 0),
        "promotion_clicks": int(promo_totals["clicks"] or 0),
        "promotion_listing_opens": int(promo_totals["listing_opens"] or 0),
        "listings": listing_rows[:12],
    }
