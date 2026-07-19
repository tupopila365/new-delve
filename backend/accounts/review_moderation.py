"""Platform moderation for marketplace traveler reviews (Phase 6)."""

from __future__ import annotations

from django.utils import timezone

from accommodation.models import AccommodationReview
from accommodation.review_services import sync_listing_rating_from_reviews
from food.models import FoodVenueReview
from food.review_services import sync_food_venue_rating
from guides.models import GuideReview
from guides.review_services import sync_guide_rating
from shop.models import ProductReview
from shop.review_services import sync_product_rating
from transport.models import SeatReservationReview, VehicleRentalReview
from transport.review_services import sync_bus_trip_rating, sync_vehicle_listing_rating

REVIEW_SOURCES = (
    "shop",
    "accommodation",
    "guide",
    "food",
    "vehicle",
    "bus_seat",
)


def _row(
    *,
    source: str,
    source_label: str,
    review,
    listing_title: str,
) -> dict:
    reviewer = getattr(review, "reviewer", None)
    return {
        "id": f"{source}:{review.pk}",
        "source": source,
        "source_label": source_label,
        "review_id": review.pk,
        "listing_title": listing_title,
        "reviewer_username": getattr(reviewer, "username", "") or "",
        "rating": review.rating,
        "body": (review.body or "")[:500],
        "is_hidden": bool(review.is_hidden),
        "moderation_note": review.moderation_note or "",
        "created_at": review.created_at.isoformat() if review.created_at else "",
    }


def list_platform_reviews(*, source: str = "", hidden: str = "", limit: int = 100) -> list[dict]:
    limit = max(1, min(int(limit or 100), 200))
    hidden = (hidden or "").strip().lower()
    source = (source or "").strip().lower()
    rows: list[dict] = []

    def take(qs, src, label, title_fn):
        nonlocal rows
        if source and source != src:
            return
        qs = qs.select_related("reviewer")
        if hidden in ("hidden", "1", "true", "yes"):
            qs = qs.filter(is_hidden=True)
        elif hidden in ("visible", "active", "0", "false"):
            qs = qs.filter(is_hidden=False)
        for review in qs.order_by("-created_at")[:limit]:
            rows.append(
                _row(
                    source=src,
                    source_label=label,
                    review=review,
                    listing_title=title_fn(review),
                )
            )

    take(
        ProductReview.objects.select_related("product"),
        "shop",
        "Shop product",
        lambda r: getattr(r.product, "name", "Product"),
    )
    take(
        AccommodationReview.objects.select_related("listing"),
        "accommodation",
        "Stay",
        lambda r: getattr(r.listing, "title", "Stay"),
    )
    take(
        GuideReview.objects.select_related("guide"),
        "guide",
        "Guide",
        lambda r: getattr(r.guide, "headline", "Guide") or "Guide",
    )
    take(
        FoodVenueReview.objects.select_related("venue"),
        "food",
        "Food venue",
        lambda r: getattr(r.venue, "name", "Venue"),
    )
    take(
        VehicleRentalReview.objects.select_related("listing"),
        "vehicle",
        "Vehicle",
        lambda r: getattr(r.listing, "title", "Vehicle"),
    )
    take(
        SeatReservationReview.objects.select_related("trip", "trip__route"),
        "bus_seat",
        "Bus trip",
        lambda r: (
            f"{r.trip.route.origin} → {r.trip.route.destination}"
            if getattr(r, "trip", None) and getattr(r.trip, "route", None)
            else "Bus trip"
        ),
    )

    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows[:limit]


def _get_review(source: str, review_id: int):
    source = (source or "").strip().lower()
    if source == "shop":
        return ProductReview.objects.select_related("product").filter(pk=review_id).first(), "shop"
    if source == "accommodation":
        return (
            AccommodationReview.objects.select_related("listing").filter(pk=review_id).first(),
            "accommodation",
        )
    if source == "guide":
        return GuideReview.objects.select_related("guide").filter(pk=review_id).first(), "guide"
    if source == "food":
        return FoodVenueReview.objects.select_related("venue").filter(pk=review_id).first(), "food"
    if source == "vehicle":
        return (
            VehicleRentalReview.objects.select_related("listing").filter(pk=review_id).first(),
            "vehicle",
        )
    if source == "bus_seat":
        return (
            SeatReservationReview.objects.select_related("trip").filter(pk=review_id).first(),
            "bus_seat",
        )
    raise ValueError("Invalid source.")


def _resync(source: str, review) -> None:
    if source == "shop":
        sync_product_rating(review.product)
    elif source == "accommodation":
        sync_listing_rating_from_reviews(review.listing)
    elif source == "guide":
        sync_guide_rating(review.guide)
    elif source == "food":
        sync_food_venue_rating(review.venue)
    elif source == "vehicle":
        sync_vehicle_listing_rating(review.listing)
    elif source == "bus_seat":
        sync_bus_trip_rating(review.trip)


def set_review_hidden(*, source: str, review_id: int, hidden: bool, note: str = "") -> dict:
    review, src = _get_review(source, review_id)
    if not review:
        raise LookupError("Review not found.")
    review.is_hidden = bool(hidden)
    review.moderation_note = (note or "").strip()[:255]
    review.save(update_fields=["is_hidden", "moderation_note"])
    _resync(src, review)
    # Re-list one row for response
    for row in list_platform_reviews(source=src, hidden="all", limit=200):
        if row["review_id"] == review.pk:
            return row
    return {
        "id": f"{src}:{review.pk}",
        "source": src,
        "review_id": review.pk,
        "is_hidden": review.is_hidden,
        "moderation_note": review.moderation_note,
        "updated_at": timezone.now().isoformat(),
    }
