from django.db.models import F
from django.utils import timezone

from common.review_aggregates import apply_rating_aggregate
from common.user_display import display_name_or_username

from .models import AccommodationListing, AccommodationReview
from .models import BookingStatus


def verified_listing_reviews(listing: AccommodationListing):
    """Reviews backed by a completed booking belonging to the reviewer and listing."""
    return AccommodationReview.objects.filter(
        listing=listing,
        is_hidden=False,
        booking__status=BookingStatus.CHECKED_OUT,
        booking__check_out__lte=timezone.localdate(),
        booking__guest_id=F("reviewer_id"),
        booking__listing_id=F("listing_id"),
    )


def sync_listing_rating_from_reviews(listing: AccommodationListing) -> None:
    """Persist aggregates using completed-booking reviews only."""
    ratings = verified_listing_reviews(listing).values_list("rating", flat=True)
    apply_rating_aggregate(listing, ratings)


def listing_reviews_payload(listing: AccommodationListing) -> dict:
    """Public review data backed exclusively by completed DELVE bookings."""
    rows = []
    for review in (
        verified_listing_reviews(listing)
        .select_related("reviewer", "reviewer__profile")
        .order_by("-created_at")[:50]
    ):
        profile = getattr(review.reviewer, "profile", None)
        name = display_name_or_username(review.reviewer)
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
                "verified_guest": True,
            }
        )

    rated = [float(r["rating"]) for r in rows if r.get("rating") is not None]
    return {
        "reviews": rows,
        "rating_avg": round(sum(rated) / len(rated), 2) if rated else 0,
        "rating_count": len(rated),
    }
