"""Traveler reviews for activity listings."""

from __future__ import annotations

from decimal import Decimal

from django.core.files.storage import default_storage

from .models import ActivityListing, ActivityReview


def _author_label(user) -> str:
    profile = getattr(user, "profile", None)
    if profile and getattr(profile, "display_name", "").strip():
        return profile.display_name.strip()
    return user.username


def _absolute_media_url(url: str, request=None) -> str:
    text = (url or "").strip()
    if not text:
        return ""
    if text.startswith(("http://", "https://", "data:")):
        return text
    if text.startswith("/") and request:
        return request.build_absolute_uri(text)
    try:
        storage_url = default_storage.url(text)
    except Exception:
        storage_url = text if text.startswith("/") else f"/media/{text.lstrip('/')}"
    if request and storage_url.startswith("/"):
        return request.build_absolute_uri(storage_url)
    return storage_url


def _reviewer_avatar(user, request=None) -> str | None:
    profile = getattr(user, "profile", None)
    avatar = getattr(profile, "avatar", None)
    if avatar:
        try:
            return _absolute_media_url(avatar.url, request)
        except Exception:
            return None
    return None


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
    ratings = list(
        ActivityReview.objects.filter(listing=listing, is_hidden=False).values_list(
            "rating", flat=True
        )
    )
    if not ratings:
        listing.rating_avg = Decimal("0")
        listing.rating_count = 0
    else:
        avg = round(sum(ratings) / len(ratings), 2)
        listing.rating_avg = Decimal(str(avg))
        listing.rating_count = len(ratings)
    listing.save(update_fields=["rating_avg", "rating_count", "updated_at"])


def normalize_review_media(raw, request=None) -> list[dict]:
    out: list[dict] = []
    if not isinstance(raw, list):
        return out
    for item in raw:
        if isinstance(item, str):
            url = item.strip()
            kind = "image"
        elif isinstance(item, dict):
            url = str(item.get("url") or item.get("image") or "").strip()
            kind = "video" if item.get("kind") == "video" else "image"
        else:
            continue
        if not url:
            continue
        out.append({"url": _absolute_media_url(url, request), "kind": kind})
    return out


def _review_row(review: ActivityReview, request=None) -> dict:
    return {
        "id": review.pk,
        "name": _author_label(review.reviewer),
        "avatar": _reviewer_avatar(review.reviewer, request),
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

    distribution = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    for r in rows:
        star = int(r["rating"]) if r["rating"] else 0
        if star in distribution:
            distribution[star] += 1

    user = getattr(request, "user", None)
    return {
        "reviews": rows,
        "rating_avg": float(listing.rating_avg or 0),
        "rating_count": listing.rating_count or 0,
        "distribution": {str(k): distribution[k] for k in (5, 4, 3, 2, 1)},
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
