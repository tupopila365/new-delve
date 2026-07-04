"""Platform admin food venue inspector payload (Phase 6)."""

from django.db.models import Count

from .models import CuisineType, FoodQuestion, FoodReservation, FoodVenue, FoodVenueReview, FoodVenueSave


def food_venue_inspector_payload(venue_id: int) -> dict | None:
    venue = (
        FoodVenue.objects.select_related("owner", "owner__profile")
        .filter(pk=venue_id)
        .first()
    )
    if not venue:
        return None

    cuisine_labels = dict(CuisineType.choices)
    saves_count = FoodVenueSave.objects.filter(venue=venue).count()
    reviews_count = FoodVenueReview.objects.filter(venue=venue).count()
    questions_count = FoodQuestion.objects.filter(venue=venue, is_hidden=False).count()

    reservation_stats = (
        FoodReservation.objects.filter(venue=venue)
        .values("status")
        .annotate(count=Count("id"))
    )
    by_status = {row["status"]: row["count"] for row in reservation_stats}

    recent_reservations = list(
        FoodReservation.objects.filter(venue=venue)
        .select_related("guest", "guest__profile")
        .order_by("-reserved_for")[:5]
        .values(
            "id",
            "guest__username",
            "party_size",
            "reserved_for",
            "status",
        )
    )
    recent_reviews = list(
        FoodVenueReview.objects.filter(venue=venue)
        .select_related("reviewer", "reviewer__profile")
        .order_by("-created_at")[:5]
        .values("id", "reviewer__username", "rating", "body", "created_at")
    )

    return {
        "listing_type": "food",
        "listing_id": venue.pk,
        "title": venue.name,
        "owner_username": venue.owner.username,
        "owner_display_name": getattr(venue.owner.profile, "display_name", "") or venue.owner.username,
        "status": "published" if venue.is_active else "unpublished",
        "cuisine": cuisine_labels.get(venue.cuisine, venue.cuisine),
        "region": venue.region,
        "city": venue.city,
        "price_level": venue.price_level,
        "reservations_enabled": venue.reservations,
        "dine_in": venue.dine_in,
        "takeaway": venue.takeaway,
        "delivery": venue.delivery,
        "rating_avg": str(venue.rating_avg),
        "rating_count": venue.rating_count,
        "saves_count": saves_count,
        "reviews_count": reviews_count,
        "questions_count": questions_count,
        "reservations_by_status": by_status,
        "recent_reservations": [
            {
                "id": r["id"],
                "guest_username": r["guest__username"],
                "party_size": r["party_size"],
                "reserved_for": r["reserved_for"].isoformat() if r["reserved_for"] else "",
                "status": r["status"],
            }
            for r in recent_reservations
        ],
        "recent_reviews": [
            {
                "id": r["id"],
                "reviewer_username": r["reviewer__username"],
                "rating": r["rating"],
                "body": r["body"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else "",
            }
            for r in recent_reviews
        ],
        "public_url": f"/food/{venue.pk}",
        "created_at": venue.created_at.isoformat() if venue.created_at else "",
    }
