"""Traveler reviews for transport bookings."""

from __future__ import annotations

from decimal import Decimal

from transport.models import BusTrip, SeatReservationReview, VehicleRentalListing, VehicleRentalReview


def _author_label(user) -> str:
    profile = getattr(user, "profile", None)
    if profile and getattr(profile, "display_name", "").strip():
        return profile.display_name.strip()
    return user.username


def sync_vehicle_listing_rating(listing: VehicleRentalListing) -> None:
    ratings = list(
        VehicleRentalReview.objects.filter(listing=listing, is_hidden=False).values_list("rating", flat=True)
    )
    if not ratings:
        listing.rating_avg = Decimal("0")
        listing.rating_count = 0
    else:
        listing.rating_avg = round(sum(ratings) / len(ratings), 2)
        listing.rating_count = len(ratings)
    listing.save(update_fields=["rating_avg", "rating_count"])


def sync_bus_trip_rating(trip: BusTrip) -> None:
    ratings = list(
        SeatReservationReview.objects.filter(trip=trip, is_hidden=False).values_list("rating", flat=True)
    )
    if not ratings:
        trip.rating_avg = Decimal("0")
        trip.rating_count = 0
    else:
        trip.rating_avg = round(sum(ratings) / len(ratings), 2)
        trip.rating_count = len(ratings)
    trip.save(update_fields=["rating_avg", "rating_count"])


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
                "name": _author_label(review.reviewer),
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
                "name": _author_label(review.reviewer),
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
