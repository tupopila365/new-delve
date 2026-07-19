"""Traveler reviews for food venues."""

from __future__ import annotations

from decimal import Decimal

from accommodation.models import BookingStatus

from .models import FoodReservation, FoodVenue, FoodVenueReview

VISITED_RESERVATION_STATUSES = frozenset(
    {BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT}
)


def _author_label(user) -> str:
    profile = getattr(user, "profile", None)
    if profile and getattr(profile, "display_name", "").strip():
        return profile.display_name.strip()
    return user.username


def eligible_food_reservation(user, venue: FoodVenue) -> FoodReservation | None:
    """Most recent seated/completed reservation the user may review."""
    if not user or not user.is_authenticated:
        return None
    return (
        FoodReservation.objects.filter(
            venue=venue,
            guest=user,
            status__in=VISITED_RESERVATION_STATUSES,
        )
        .order_by("-reserved_for")
        .first()
    )


def user_can_review_food_venue(user, venue: FoodVenue) -> bool:
    if not user or not user.is_authenticated:
        return False
    if venue.owner_id == user.id:
        return False
    if FoodVenueReview.objects.filter(venue=venue, reviewer=user).exists():
        return False
    # Always require a seated/completed reservation on Delve (no open walk-in reviews).
    return eligible_food_reservation(user, venue) is not None


def _json_review_ratings(venue: FoodVenue) -> list[float]:
    ratings: list[float] = []
    for row in venue.guest_reviews or []:
        if not isinstance(row, dict):
            continue
        raw = row.get("rating")
        if raw is None:
            continue
        try:
            ratings.append(float(raw))
        except (TypeError, ValueError):
            continue
    return ratings


def sync_food_venue_rating(venue: FoodVenue) -> None:
    ratings = _json_review_ratings(venue)
    ratings.extend(
        float(r)
        for r in FoodVenueReview.objects.filter(venue=venue, is_hidden=False).values_list("rating", flat=True)
    )
    if not ratings:
        venue.rating_avg = Decimal("0")
        venue.rating_count = 0
    else:
        venue.rating_avg = Decimal(str(round(sum(ratings) / len(ratings), 2)))
        venue.rating_count = len(ratings)
    venue.save(update_fields=["rating_avg", "rating_count"])


def food_venue_reviews_payload(venue: FoodVenue) -> dict:
    rows = []
    for review in (
        FoodVenueReview.objects.filter(venue=venue, is_hidden=False)
        .select_related("reviewer", "reviewer__profile")
        .order_by("-created_at")[:50]
    ):
        profile = getattr(review.reviewer, "profile", None)
        avatar = None
        if profile and profile.avatar:
            avatar = profile.avatar.url if hasattr(profile.avatar, "url") else str(profile.avatar)
        place = ", ".join(p for p in [venue.city, venue.region] if p)
        rows.append(
            {
                "id": f"traveler-{review.pk}",
                "source": "traveler",
                "name": _author_label(review.reviewer),
                "place": place or venue.name,
                "rating": review.rating,
                "body": review.body,
                "seller_reply": (review.seller_reply or "").strip(),
                "seller_replied_at": (
                    review.seller_replied_at.isoformat() if review.seller_replied_at else ""
                ),
                "avatar": avatar,
                "created_at": review.created_at.isoformat(),
            }
        )

    for i, row in enumerate(venue.guest_reviews or []):
        if not isinstance(row, dict):
            continue
        rows.append(
            {
                "id": f"seed-{i}",
                "source": "host",
                "name": row.get("name") or "Guest",
                "place": row.get("place") or venue.name,
                "rating": row.get("rating"),
                "body": row.get("body") or "",
                "avatar": row.get("avatar"),
            }
        )

    rated = [float(r["rating"]) for r in rows if r.get("rating") is not None]
    if rated:
        avg = round(sum(rated) / len(rated), 2)
        count = len(rated)
    else:
        avg = float(venue.rating_avg or 0)
        count = venue.rating_count or 0

    return {"reviews": rows, "rating_avg": avg, "rating_count": count}
