"""Provider seller replies on marketplace traveler reviews (Phase 6)."""

from __future__ import annotations

from django.utils import timezone

from accommodation.models import AccommodationReview
from accounts.business_access import provider_listing_owner_ids, user_can_manage_listing
from food.models import FoodVenueReview
from guides.models import GuideReview
from shop.models import ProductReview
from transport.models import SeatReservationReview, VehicleRentalReview

REVIEW_SOURCES = (
    "shop",
    "accommodation",
    "guide",
    "food",
    "vehicle",
    "bus_seat",
)

CATEGORY_BY_SOURCE = {
    "shop": "Shop",
    "accommodation": "Stay",
    "guide": "Guide",
    "food": "Food",
    "vehicle": "Transport",
    "bus_seat": "Transport",
}

MAX_REPLY_LEN = 2000


def _author_label(user) -> str:
    profile = getattr(user, "profile", None)
    if profile and getattr(profile, "display_name", "").strip():
        return profile.display_name.strip()
    return getattr(user, "username", "") or ""


def _listing_owner_id(source: str, review) -> int | None:
    if source == "shop":
        return getattr(review.product, "owner_id", None)
    if source == "accommodation":
        return getattr(review.listing, "owner_id", None)
    if source == "guide":
        return getattr(review.guide, "user_id", None)
    if source == "food":
        return getattr(review.venue, "owner_id", None)
    if source == "vehicle":
        return getattr(review.listing, "owner_id", None)
    if source == "bus_seat":
        trip = getattr(review, "trip", None)
        route = getattr(trip, "route", None) if trip else None
        operator = getattr(route, "operator", None) if route else None
        return getattr(operator, "owner_id", None)
    return None


def _listing_title(source: str, review) -> str:
    if source == "shop":
        return getattr(review.product, "name", "Product") or "Product"
    if source == "accommodation":
        return getattr(review.listing, "title", "Stay") or "Stay"
    if source == "guide":
        return getattr(review.guide, "headline", "Guide") or "Guide"
    if source == "food":
        return getattr(review.venue, "name", "Venue") or "Venue"
    if source == "vehicle":
        return getattr(review.listing, "title", "Vehicle") or "Vehicle"
    if source == "bus_seat":
        trip = getattr(review, "trip", None)
        route = getattr(trip, "route", None) if trip else None
        if route:
            return f"{route.origin} → {route.destination}"
        return "Bus trip"
    return "Listing"


def _row(source: str, review) -> dict:
    reply = (review.seller_reply or "").strip()
    return {
        "id": f"{source}:{review.pk}",
        "source": source,
        "source_label": {
            "shop": "Shop product",
            "accommodation": "Stay",
            "guide": "Guide",
            "food": "Food venue",
            "vehicle": "Vehicle",
            "bus_seat": "Bus trip",
        }.get(source, source),
        "review_id": review.pk,
        "category": CATEGORY_BY_SOURCE.get(source, ""),
        "listing_title": _listing_title(source, review),
        "guest": _author_label(review.reviewer),
        "rating": review.rating,
        "body": review.body or "",
        "created_at": review.created_at.isoformat() if review.created_at else "",
        "seller_reply": reply,
        "seller_replied_at": (
            review.seller_replied_at.isoformat() if review.seller_replied_at else ""
        ),
        "needs_reply": not bool(reply),
    }


def _get_review(source: str, review_id: int):
    source = (source or "").strip().lower()
    if source == "shop":
        return (
            ProductReview.objects.select_related("product", "reviewer", "reviewer__profile")
            .filter(pk=review_id)
            .first()
        )
    if source == "accommodation":
        return (
            AccommodationReview.objects.select_related(
                "listing", "reviewer", "reviewer__profile"
            )
            .filter(pk=review_id)
            .first()
        )
    if source == "guide":
        return (
            GuideReview.objects.select_related("guide", "reviewer", "reviewer__profile")
            .filter(pk=review_id)
            .first()
        )
    if source == "food":
        return (
            FoodVenueReview.objects.select_related("venue", "reviewer", "reviewer__profile")
            .filter(pk=review_id)
            .first()
        )
    if source == "vehicle":
        return (
            VehicleRentalReview.objects.select_related(
                "listing", "reviewer", "reviewer__profile"
            )
            .filter(pk=review_id)
            .first()
        )
    if source == "bus_seat":
        return (
            SeatReservationReview.objects.select_related(
                "trip",
                "trip__route",
                "trip__route__operator",
                "reviewer",
                "reviewer__profile",
            )
            .filter(pk=review_id)
            .first()
        )
    raise ValueError(f"Unknown review source: {source}")


def list_provider_reviews(user, *, source: str = "", needs_reply: str = "", limit: int = 200) -> list[dict]:
    owner_ids = provider_listing_owner_ids(user)
    limit = max(1, min(int(limit or 200), 300))
    source = (source or "").strip().lower()
    needs = (needs_reply or "").strip().lower()
    rows: list[dict] = []

    def take(qs, src, select_extra=()):
        nonlocal rows
        if source and source != src:
            return
        qs = qs.select_related("reviewer", "reviewer__profile", *select_extra).filter(
            is_hidden=False
        )
        for review in qs.order_by("-created_at")[:limit]:
            owner_id = _listing_owner_id(src, review)
            if owner_id not in owner_ids:
                continue
            row = _row(src, review)
            if needs in ("1", "true", "yes", "needs"):
                if not row["needs_reply"]:
                    continue
            elif needs in ("0", "false", "answered"):
                if row["needs_reply"]:
                    continue
            rows.append(row)

    take(
        ProductReview.objects.filter(product__owner_id__in=owner_ids),
        "shop",
        ("product",),
    )
    take(
        AccommodationReview.objects.filter(listing__owner_id__in=owner_ids),
        "accommodation",
        ("listing",),
    )
    take(
        GuideReview.objects.filter(guide__user_id__in=owner_ids),
        "guide",
        ("guide",),
    )
    take(
        FoodVenueReview.objects.filter(venue__owner_id__in=owner_ids),
        "food",
        ("venue",),
    )
    take(
        VehicleRentalReview.objects.filter(listing__owner_id__in=owner_ids),
        "vehicle",
        ("listing",),
    )
    take(
        SeatReservationReview.objects.filter(
            trip__route__operator__owner_id__in=owner_ids
        ),
        "bus_seat",
        ("trip", "trip__route", "trip__route__operator"),
    )

    rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    return rows[:limit]


def set_seller_reply(*, user, source: str, review_id: int, reply: str) -> dict:
    source = (source or "").strip().lower()
    if source not in REVIEW_SOURCES:
        raise ValueError("Invalid review source.")
    try:
        rid = int(review_id)
    except (TypeError, ValueError) as exc:
        raise ValueError("review_id required.") from exc

    review = _get_review(source, rid)
    if review is None:
        raise LookupError("Review not found.")

    owner_id = _listing_owner_id(source, review)
    if owner_id is None or not user_can_manage_listing(user, owner_id):
        raise PermissionError("Not allowed to reply to this review.")

    text = (reply or "").strip()
    if len(text) > MAX_REPLY_LEN:
        raise ValueError(f"Reply must be at most {MAX_REPLY_LEN} characters.")

    if text:
        review.seller_reply = text
        review.seller_replied_at = timezone.now()
    else:
        review.seller_reply = ""
        review.seller_replied_at = None
    review.save(update_fields=["seller_reply", "seller_replied_at"])
    return _row(source, review)
