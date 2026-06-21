"""Provider-owned listings and promotion request helpers."""

from __future__ import annotations

from django.contrib.auth import get_user_model

from promotions.constants import PROMOTION_PRICING
from promotions.models import PromotionPlacement, PromotionTargetType

User = get_user_model()

PROVIDER_PLACEMENT_VALUES = {
    PromotionPlacement.HOMEPAGE_STAYS,
    PromotionPlacement.HOMEPAGE_GUIDES,
    PromotionPlacement.HOMEPAGE_FOOD,
    PromotionPlacement.HOMEPAGE_EVENTS,
    PromotionPlacement.HOMEPAGE_TRANSPORT,
    PromotionPlacement.DELVERS_FEED,
}


def pricing_for_placement(placement: str) -> dict | None:
    for row in PROMOTION_PRICING:
        if row["placement"] == placement:
            return row
    return None


def provider_owns_target(user, target_type: str, target_id: str) -> bool:
    try:
        lid = int(target_id)
    except (TypeError, ValueError):
        return False

    if target_type == PromotionTargetType.ACCOMMODATION:
        from accommodation.models import AccommodationListing

        return AccommodationListing.objects.filter(pk=lid, owner=user, is_active=True).exists()

    if target_type == PromotionTargetType.GUIDE:
        from guides.models import TourGuideProfile

        return TourGuideProfile.objects.filter(pk=lid, user=user, is_active=True).exists()

    if target_type == PromotionTargetType.FOOD:
        from food.models import FoodVenue

        return FoodVenue.objects.filter(pk=lid, owner=user, is_active=True).exists()

    if target_type == PromotionTargetType.EVENT:
        from events_app.models import Event

        return Event.objects.filter(pk=lid, organizer=user, is_published=True).exists()

    if target_type == PromotionTargetType.VEHICLE:
        from transport.models import VehicleRentalListing

        return VehicleRentalListing.objects.filter(pk=lid, owner=user, is_active=True).exists()

    if target_type == PromotionTargetType.POST:
        from social.models import Post

        return Post.objects.filter(pk=lid, author=user, is_hidden=False).exists()

    return False


def list_provider_listings(user) -> list[dict]:
    rows: list[dict] = []

    from accommodation.models import AccommodationListing

    for item in AccommodationListing.objects.filter(owner=user, is_active=True).order_by("-created_at")[:50]:
        rows.append(
            {
                "target_type": PromotionTargetType.ACCOMMODATION,
                "target_id": str(item.pk),
                "label": item.title,
                "region": item.region,
                "city": item.city or "",
                "category_label": "Stay",
            }
        )

    from guides.models import TourGuideProfile

    guide = TourGuideProfile.objects.filter(user=user, is_active=True).first()
    if guide:
        rows.append(
            {
                "target_type": PromotionTargetType.GUIDE,
                "target_id": str(guide.pk),
                "label": guide.headline,
                "region": ", ".join((guide.regions or [])[:2]),
                "city": "",
                "category_label": "Guide",
            }
        )

    from food.models import FoodVenue

    for item in FoodVenue.objects.filter(owner=user, is_active=True).order_by("name")[:50]:
        rows.append(
            {
                "target_type": PromotionTargetType.FOOD,
                "target_id": str(item.pk),
                "label": item.name,
                "region": item.region,
                "city": item.city or "",
                "category_label": "Food & drink",
            }
        )

    from events_app.models import Event

    for item in Event.objects.filter(organizer=user, is_published=True).order_by("-starts_at")[:50]:
        rows.append(
            {
                "target_type": PromotionTargetType.EVENT,
                "target_id": str(item.pk),
                "label": item.title,
                "region": item.region,
                "city": item.city or "",
                "category_label": "Event",
            }
        )

    from transport.models import VehicleRentalListing

    for item in VehicleRentalListing.objects.filter(owner=user, is_active=True).order_by("-created_at")[:50]:
        rows.append(
            {
                "target_type": PromotionTargetType.VEHICLE,
                "target_id": str(item.pk),
                "label": item.title or f"{item.make} {item.model}",
                "region": item.region,
                "city": item.city or "",
                "category_label": "Vehicle",
            }
        )

    from social.models import Post

    for item in Post.objects.filter(author=user, is_hidden=False, is_delvers=True).order_by("-created_at")[:30]:
        body = (item.body or item.delvers_board or f"Post #{item.pk}")[:80]
        rows.append(
            {
                "target_type": PromotionTargetType.POST,
                "target_id": str(item.pk),
                "label": body,
                "region": item.region,
                "city": "",
                "category_label": "Delvers post",
            }
        )

    return rows
