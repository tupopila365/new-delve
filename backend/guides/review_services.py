"""Traveler reviews for tour guides."""

from __future__ import annotations

from decimal import Decimal

from .models import GuideBooking, GuideReview, TourGuideProfile


def _author_label(user) -> str:
    profile = getattr(user, "profile", None)
    if profile and getattr(profile, "display_name", "").strip():
        return profile.display_name.strip()
    return user.username


def eligible_guide_booking(user, guide: TourGuideProfile) -> GuideBooking | None:
    """Most recent completed booking the user may review."""
    if not user or not user.is_authenticated:
        return None
    return (
        GuideBooking.objects.filter(
            guide=guide,
            client=user,
            status="completed",
        )
        .order_by("-date", "-created_at")
        .first()
    )


def user_can_review_guide(user, guide: TourGuideProfile) -> bool:
    if not user or not user.is_authenticated:
        return False
    if guide.user_id == user.id:
        return False
    if GuideReview.objects.filter(guide=guide, reviewer=user).exists():
        return False
    return eligible_guide_booking(user, guide) is not None


def user_has_reviewed_guide(user, guide: TourGuideProfile) -> bool:
    if not user or not user.is_authenticated:
        return False
    return GuideReview.objects.filter(guide=guide, reviewer=user).exists()


def _json_review_ratings(guide: TourGuideProfile) -> list[float]:
    ratings: list[float] = []
    for row in guide.guest_reviews or []:
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


def sync_guide_rating(guide: TourGuideProfile) -> None:
    ratings = _json_review_ratings(guide)
    ratings.extend(
        float(r)
        for r in GuideReview.objects.filter(guide=guide).values_list("rating", flat=True)
    )
    if not ratings:
        guide.rating_avg = Decimal("0")
        guide.rating_count = 0
    else:
        guide.rating_avg = Decimal(str(round(sum(ratings) / len(ratings), 2)))
        guide.rating_count = len(ratings)
    guide.save(update_fields=["rating_avg", "rating_count"])


def guide_reviews_payload(guide: TourGuideProfile) -> dict:
    rows = []
    for review in (
        GuideReview.objects.filter(guide=guide)
        .select_related("reviewer", "reviewer__profile")
        .order_by("-created_at")[:50]
    ):
        profile = getattr(review.reviewer, "profile", None)
        avatar = None
        if profile and profile.avatar:
            avatar = profile.avatar.url if hasattr(profile.avatar, "url") else str(profile.avatar)
        place = ", ".join(p for p in (guide.regions or [])[:2])
        rows.append(
            {
                "id": f"traveler-{review.pk}",
                "source": "traveler",
                "name": _author_label(review.reviewer),
                "place": place or guide.headline,
                "rating": review.rating,
                "body": review.body,
                "avatar": avatar,
                "created_at": review.created_at.isoformat(),
            }
        )

    for i, row in enumerate(guide.guest_reviews or []):
        if not isinstance(row, dict):
            continue
        rows.append(
            {
                "id": f"seed-{i}",
                "source": "host",
                "name": row.get("name") or "Guest",
                "place": row.get("place") or guide.headline,
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
        avg = float(guide.rating_avg or 0)
        count = guide.rating_count or 0

    return {"reviews": rows, "rating_avg": avg, "rating_count": count}
