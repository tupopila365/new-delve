from decimal import Decimal

from .models import AccommodationListing, AccommodationReview


def _json_review_ratings(listing: AccommodationListing) -> list[float]:
    ratings: list[float] = []
    for row in listing.guest_reviews or []:
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


def sync_listing_rating_from_reviews(listing: AccommodationListing) -> None:
    """Merge seeded JSON reviews with traveler-submitted reviews for listing aggregates."""
    ratings = _json_review_ratings(listing)
    ratings.extend(
        float(r)
        for r in AccommodationReview.objects.filter(listing=listing, is_hidden=False).values_list(
            "rating", flat=True
        )
    )
    if not ratings:
        return
    listing.rating_avg = Decimal(str(round(sum(ratings) / len(ratings), 2)))
    listing.rating_count = len(ratings)
    listing.save(update_fields=["rating_avg", "rating_count"])


def listing_reviews_payload(listing: AccommodationListing) -> dict:
    """API reviews list: traveler reviews plus seeded host JSON entries."""
    rows = []
    for review in (
        AccommodationReview.objects.filter(listing=listing, is_hidden=False)
        .select_related("reviewer", "reviewer__profile")
        .order_by("-created_at")[:50]
    ):
        profile = getattr(review.reviewer, "profile", None)
        name = profile.display_name if profile and profile.display_name else review.reviewer.username
        avatar = None
        if profile and profile.avatar:
            avatar = profile.avatar.url if hasattr(profile.avatar, "url") else str(profile.avatar)
        place = ", ".join(p for p in [listing.city, listing.region] if p)
        rows.append(
            {
                "id": f"traveler-{review.pk}",
                "name": name,
                "place": place,
                "rating": review.rating,
                "body": review.body,
                "seller_reply": (review.seller_reply or "").strip(),
                "seller_replied_at": (
                    review.seller_replied_at.isoformat() if review.seller_replied_at else ""
                ),
                "avatar": avatar,
                "created_at": review.created_at.isoformat(),
                "source": "traveler",
            }
        )

    for i, row in enumerate(listing.guest_reviews or []):
        if not isinstance(row, dict):
            continue
        rows.append(
            {
                "id": f"seed-{i}",
                "name": row.get("name") or "Guest",
                "place": row.get("place") or listing.region,
                "rating": row.get("rating"),
                "body": row.get("body") or "",
                "avatar": row.get("avatar"),
                "source": "host",
            }
        )

    rated = [float(r["rating"]) for r in rows if r.get("rating") is not None]
    if rated:
        avg = round(sum(rated) / len(rated), 2)
        count = len(rated)
    else:
        avg = float(listing.rating_avg or 0)
        count = listing.rating_count or 0

    return {"reviews": rows, "rating_avg": avg, "rating_count": count}
