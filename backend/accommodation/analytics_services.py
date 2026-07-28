from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from promotions.models import PromotionCampaign, PromotionStatus, PromotionTargetType

from .models import (
    AccommodationAvailability,
    AccommodationBooking,
    AccommodationListing,
    AccommodationListingLike,
    AccommodationListingSave,
    AccommodationPageView,
    AccommodationRoomType,
    BookingStatus,
)


def _decimal_sum(value) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _night_dates(check_in: date, check_out: date):
    current = check_in
    while current < check_out:
        yield current
        current += timedelta(days=1)


def _booking_revenue_by_night(booking: AccommodationBooking) -> dict[date, Decimal]:
    """Use immutable nightly snapshots when present, with a proportional fallback."""
    prices: dict[date, Decimal] = {}
    for row in booking.nightly_price_snapshot or []:
        if not isinstance(row, dict):
            continue
        try:
            night = date.fromisoformat(str(row.get("date") or ""))
            prices[night] = Decimal(str(row.get("price") or "0"))
        except (TypeError, ValueError, ArithmeticError):
            continue
    if prices:
        return prices

    nights = max(1, (booking.check_out - booking.check_in).days)
    per_night = Decimal(booking.total_price) / Decimal(nights)
    return {night: per_night for night in _night_dates(booking.check_in, booking.check_out)}


def _stay_operations_analytics(
    *,
    listings,
    listing_ids: list[int],
    days: int,
    now,
) -> dict:
    """Calendar occupancy, earned revenue, room comparison, and expiring holds."""
    today = timezone.localdate()
    period_start = today - timedelta(days=max(1, days) - 1)
    period_end = today + timedelta(days=1)
    period_dates = list(_night_dates(period_start, period_end))

    rooms = list(
        AccommodationRoomType.objects.filter(listing_id__in=listing_ids)
        .select_related("listing")
        .order_by("listing_id", "sort_order", "id")
    )
    rooms_by_listing: dict[int, list[AccommodationRoomType]] = {}
    for room in rooms:
        rooms_by_listing.setdefault(room.listing_id, []).append(room)

    stay_qs = (
        AccommodationBooking.objects.filter(
            listing_id__in=listing_ids,
            check_in__lt=period_end,
            check_out__gt=period_start,
            status__in=(
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT,
            ),
        )
        .select_related("listing", "room_type", "guest", "guest__profile")
        .order_by("check_in", "id")
    )
    stay_bookings = list(stay_qs)

    overrides = list(
        AccommodationAvailability.objects.filter(
            listing_id__in=listing_ids,
            date__gte=period_start,
            date__lt=period_end,
        ).only(
            "listing_id",
            "room_type_id",
            "date",
            "is_available",
            "quantity_available",
        )
    )
    property_overrides = {
        (row.listing_id, row.date): row for row in overrides if row.room_type_id is None
    }
    room_overrides = {
        (row.room_type_id, row.date): row for row in overrides if row.room_type_id is not None
    }

    daily = {
        night: {
            "occupied_room_nights": 0,
            "available_room_nights": 0,
            "revenue": Decimal("0"),
        }
        for night in period_dates
    }
    room_metrics: dict[tuple[int, int | None], dict] = {}

    for listing in listings:
        listing_rooms = rooms_by_listing.get(listing.pk, [])
        metric_rows = listing_rooms or [None]
        capacity_rows = [room for room in listing_rooms if room.is_active]
        if not capacity_rows:
            capacity_rows = [None]
        for room in metric_rows:
            key = (listing.pk, room.pk if room else None)
            room_metrics[key] = {
                "listing_id": listing.pk,
                "listing_title": listing.title,
                "room_id": room.pk if room else None,
                "room_name": room.name if room else "Whole property",
                "units": room.quantity_available if room else 1,
                "bookings": 0,
                "booked_nights": 0,
                "available_room_nights": 0,
                "revenue": Decimal("0"),
            }
        for room in capacity_rows:
            key = (listing.pk, room.pk if room else None)
            for night in period_dates:
                property_override = property_overrides.get((listing.pk, night))
                room_override = room_overrides.get((room.pk, night)) if room else None
                if property_override and not property_override.is_available:
                    quantity = 0
                elif room_override and not room_override.is_available:
                    quantity = 0
                elif room_override and room_override.quantity_available is not None:
                    quantity = room_override.quantity_available
                elif room is None and property_override and property_override.quantity_available is not None:
                    quantity = property_override.quantity_available
                else:
                    quantity = room.quantity_available if room else 1
                daily[night]["available_room_nights"] += quantity
                room_metrics[key]["available_room_nights"] += quantity

    for booking in stay_bookings:
        key = (booking.listing_id, booking.room_type_id)
        if key not in room_metrics:
            key = (booking.listing_id, None)
        metric = room_metrics.get(key)
        if metric is not None:
            metric["bookings"] += 1

        paid = bool(booking.paid_at or booking.mock_payment_ref)
        nightly_revenue = _booking_revenue_by_night(booking) if paid else {}
        for night in _night_dates(
            max(booking.check_in, period_start),
            min(booking.check_out, period_end),
        ):
            daily[night]["occupied_room_nights"] += 1
            if metric is not None:
                metric["booked_nights"] += 1
            revenue = nightly_revenue.get(night, Decimal("0"))
            daily[night]["revenue"] += revenue
            if metric is not None:
                metric["revenue"] += revenue

    occupancy_revenue_trend = []
    for night in period_dates:
        row = daily[night]
        available = row["available_room_nights"]
        occupied = row["occupied_room_nights"]
        occupancy_revenue_trend.append(
            {
                "date": night.isoformat(),
                "occupied_room_nights": occupied,
                "available_room_nights": available,
                "occupancy_rate": round((occupied / available) * 100, 1) if available else 0.0,
                "revenue": float(row["revenue"]),
            }
        )

    room_performance = []
    for metric in room_metrics.values():
        available = metric["available_room_nights"]
        booked = metric["booked_nights"]
        room_performance.append(
            {
                **metric,
                "revenue": float(metric["revenue"]),
                "occupancy_rate": round((booked / available) * 100, 1) if available else 0.0,
            }
        )
    room_performance.sort(
        key=lambda row: (row["revenue"], row["occupancy_rate"], row["booked_nights"]),
        reverse=True,
    )

    alert_deadline = now + timedelta(hours=4)
    expiring_qs = (
        AccommodationBooking.objects.filter(
            listing_id__in=listing_ids,
            status__in=(BookingStatus.PENDING, BookingStatus.CONFIRMED),
            hold_expires_at__gt=now,
            hold_expires_at__lte=alert_deadline,
            paid_at__isnull=True,
            mock_payment_ref="",
        )
        .select_related("listing", "guest", "guest__profile")
        .order_by("hold_expires_at")[:20]
    )
    expiring_requests = []
    for booking in expiring_qs:
        profile = getattr(booking.guest, "profile", None)
        guest_name = (
            str(getattr(profile, "display_name", "") or "").strip()
            if profile
            else ""
        ) or booking.guest.username
        expiring_requests.append(
            {
                "id": booking.pk,
                "listing_id": booking.listing_id,
                "listing_title": booking.listing_title_snapshot or booking.listing.title,
                "guest": guest_name,
                "guest_display_name": guest_name,
                "status": booking.status,
                "hold_expires_at": booking.hold_expires_at.isoformat(),
                "minutes_remaining": max(
                    0,
                    int((booking.hold_expires_at - now).total_seconds() // 60),
                ),
            }
        )

    occupied_total = sum(row["occupied_room_nights"] for row in daily.values())
    available_total = sum(row["available_room_nights"] for row in daily.values())
    return {
        "occupancy_rate": (
            round((occupied_total / available_total) * 100, 1) if available_total else 0.0
        ),
        "occupied_room_nights": occupied_total,
        "available_room_nights": available_total,
        "occupancy_revenue_trend": occupancy_revenue_trend,
        "room_performance": room_performance,
        "expiring_requests": expiring_requests,
    }


def provider_stay_monetization_analytics(
    *,
    owner_ids: list[int],
    days: int = 30,
    business_id: int | None = None,
) -> dict:
    from .booking_services import expire_stale_booking_holds

    expire_stale_booking_holds()
    now = timezone.now()
    since = now - timedelta(days=max(1, days))
    listings = AccommodationListing.objects.filter(owner_id__in=owner_ids)
    if business_id is not None:
        listings = listings.filter(business_id=business_id)
    listing_ids = list(listings.values_list("pk", flat=True))

    bookings = (
        AccommodationBooking.objects.filter(listing_id__in=listing_ids, created_at__gte=since)
        .exclude(
            status__in=[
                BookingStatus.CANCELLED,
                BookingStatus.EXPIRED,
                BookingStatus.REFUNDED,
            ]
        )
        .select_related("listing")
    )

    paid_bookings = bookings.filter(
        status__in=[BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]
    ).filter(
        Q(paid_at__isnull=False) | ~Q(mock_payment_ref="")
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
        rev = paid_bookings.filter(listing_id=listing.pk).aggregate(t=Sum("total_price"))["t"]
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

    operations = _stay_operations_analytics(
        listings=list(listings),
        listing_ids=listing_ids,
        days=days,
        now=now,
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
        **operations,
    }
