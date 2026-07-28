"""Traveler reviews for activity listings."""

from __future__ import annotations

from common.media_urls import absolute_media_url
from common.review_aggregates import (
    apply_rating_aggregate,
    normalize_review_media,
    rating_distribution,
)
from common.user_display import display_name_or_username, profile_avatar_url

from .models import ActivityListing, ActivityReview

__all__ = [
    "absolute_media_url",
    "activity_reviews_payload",
    "normalize_review_media",
    "sync_activity_rating",
    "user_can_review_activity",
]


def user_can_review_activity(user, listing: ActivityListing) -> bool:
    """Interim: any signed-in non-owner who has not reviewed yet.

    When activity bookings exist, tighten this to completed bookings only.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if listing.owner_id == user.id:
        return False
    if ActivityReview.objects.filter(listing=listing, reviewer=user).exists():
        return False
    return True


def sync_activity_rating(listing: ActivityListing) -> None:
    ratings = ActivityReview.objects.filter(listing=listing, is_hidden=False).values_list(
        "rating", flat=True
    )
    apply_rating_aggregate(listing, ratings, update_fields=["updated_at"])


def _review_row(review: ActivityReview, request=None) -> dict:
    return {
        "id": review.pk,
        "name": display_name_or_username(review.reviewer),
        "avatar": profile_avatar_url(review.reviewer, request),
        "rating": review.rating,
        "body": review.body,
        "seller_reply": (review.seller_reply or "").strip(),
        "seller_replied_at": (
            review.seller_replied_at.isoformat() if review.seller_replied_at else ""
        ),
        "media": normalize_review_media(review.media, request),
        # No booking model yet — always unverified until bookings land.
        "verified_experience": False,
        "created_at": review.created_at.isoformat(),
    }


def activity_reviews_payload(listing: ActivityListing, request=None) -> dict:
    reviews = (
        ActivityReview.objects.filter(listing=listing, is_hidden=False)
        .select_related("reviewer", "reviewer__profile")
        .order_by("-created_at")[:100]
    )
    rows = [_review_row(r, request) for r in reviews]

    user = getattr(request, "user", None)
    return {
        "reviews": rows,
        "rating_avg": float(listing.rating_avg or 0),
        "rating_count": listing.rating_count or 0,
        "distribution": rating_distribution(r["rating"] for r in rows),
        "can_review": user_can_review_activity(user, listing),
        "has_reviewed": bool(
            user
            and getattr(user, "is_authenticated", False)
            and ActivityReview.objects.filter(listing=listing, reviewer=user).exists()
        ),
        "is_owner": bool(
            user
            and getattr(user, "is_authenticated", False)
            and listing.owner_id == user.id
        ),
    }
