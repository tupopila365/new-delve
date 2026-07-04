"""Provider food dashboard analytics (Phase 6)."""

from datetime import timedelta

from django.db.models import Count, Sum
from django.utils import timezone

from accommodation.models import BookingStatus
from promotions.models import PromotionCampaign, PromotionStatus, PromotionTargetType

from .models import FoodReservation, FoodVenue, FoodVenueReview, FoodVenueSave


def provider_food_analytics(*, owner_ids: list[int], days: int = 30) -> dict:
    since = timezone.now() - timedelta(days=max(1, days))
    venues = FoodVenue.objects.filter(owner_id__in=owner_ids)
    venue_ids = list(venues.values_list("pk", flat=True))

    reservations = FoodReservation.objects.filter(
        venue_id__in=venue_ids,
        created_at__gte=since,
    ).exclude(status__in=[BookingStatus.CANCELLED, BookingStatus.REFUNDED])

    seated = reservations.filter(
        status__in=[BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]
    )
    total_saves = FoodVenueSave.objects.filter(venue_id__in=venue_ids).count()
    total_reviews = FoodVenueReview.objects.filter(venue_id__in=venue_ids).count()

    promo_qs = PromotionCampaign.objects.filter(
        target_type=PromotionTargetType.FOOD,
        target_id__in=[str(i) for i in venue_ids],
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

    venue_rows = []
    for venue in venues.annotate(
        saves_count=Count("user_saves", distinct=True),
        reviews_count=Count("traveler_reviews", distinct=True),
    ).order_by("-created_at")[:50]:
        venue_reservations = reservations.filter(venue_id=venue.pk)
        venue_rows.append(
            {
                "id": venue.pk,
                "name": venue.name,
                "reservations": venue_reservations.count(),
                "confirmed_reservations": venue_reservations.filter(
                    status__in=[
                        BookingStatus.CONFIRMED,
                        BookingStatus.CHECKED_IN,
                        BookingStatus.CHECKED_OUT,
                    ]
                ).count(),
                "seated_visits": venue_reservations.filter(
                    status__in=[BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]
                ).count(),
                "saves_count": venue.saves_count,
                "reviews_count": venue.reviews_count,
                "rating_avg": float(venue.rating_avg or 0),
            }
        )
    venue_rows.sort(
        key=lambda r: (r["reservations"], r["saves_count"], r["reviews_count"]),
        reverse=True,
    )

    return {
        "days": days,
        "total_reservations": reservations.count(),
        "confirmed_reservations": reservations.filter(
            status__in=[
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT,
            ]
        ).count(),
        "pending_requests": reservations.filter(status=BookingStatus.PENDING).count(),
        "seated_visits": seated.count(),
        "total_saves": total_saves,
        "total_reviews": total_reviews,
        "promotion_impressions": int(promo_totals["impressions"] or 0),
        "promotion_clicks": int(promo_totals["clicks"] or 0),
        "promotion_listing_opens": int(promo_totals["listing_opens"] or 0),
        "venues": venue_rows[:12],
    }
