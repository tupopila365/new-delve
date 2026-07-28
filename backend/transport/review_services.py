"""Traveler reviews for transport bookings."""

from __future__ import annotations

from common.review_aggregates import apply_rating_aggregate
from common.user_display import display_name_or_username

from transport.models import BusTrip, SeatReservationReview, VehicleRentalListing, VehicleRentalReview


def sync_vehicle_listing_rating(listing: VehicleRentalListing) -> None:
    ratings = VehicleRentalReview.objects.filter(listing=listing, is_hidden=False).values_list(
        "rating", flat=True
    )
    apply_rating_aggregate(listing, ratings)


def sync_bus_trip_rating(trip: BusTrip) -> None:
    ratings = SeatReservationReview.objects.filter(trip=trip, is_hidden=False).values_list(
        "rating", flat=True
    )
    apply_rating_aggregate(trip, ratings)


def vehicle_reviews_payload(listing: VehicleRentalListing) -> dict:
    rows = []
    for review in (
        VehicleRentalReview.objects.filter(listing=listing, is_hidden=False)
        .select_related("reviewer", "reviewer__profile")
        .order_by("-created_at")[:50]
    ):
        rows.append(
            {
                "id": f"traveler-{review.pk}",
                "source": "traveler",
                "name": display_name_or_username(review.reviewer),
                "place": listing.city or listing.region,
                "rating": review.rating,
                "body": review.body,
                "seller_reply": (review.seller_reply or "").strip(),
                "seller_replied_at": (
                    review.seller_replied_at.isoformat() if review.seller_replied_at else ""
                ),
                "created_at": review.created_at.isoformat(),
            }
        )
    avg = str(listing.rating_avg) if listing.rating_count else None
    return {"reviews": rows, "rating_avg": avg, "rating_count": listing.rating_count}


def bus_trip_reviews_payload(trip: BusTrip) -> dict:
    rows = []
    for review in (
        SeatReservationReview.objects.filter(trip=trip, is_hidden=False)
        .select_related("reviewer", "reviewer__profile")
        .order_by("-created_at")[:50]
    ):
        rows.append(
            {
                "id": f"traveler-{review.pk}",
                "source": "traveler",
                "name": display_name_or_username(review.reviewer),
                "place": trip.route.origin,
                "rating": review.rating,
                "body": review.body,
                "seller_reply": (review.seller_reply or "").strip(),
                "seller_replied_at": (
                    review.seller_replied_at.isoformat() if review.seller_replied_at else ""
                ),
                "created_at": review.created_at.isoformat(),
            }
        )
    avg = str(trip.rating_avg) if trip.rating_count else None
    return {"reviews": rows, "rating_avg": avg, "rating_count": trip.rating_count}
