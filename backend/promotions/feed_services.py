"""Inject sponsored posts and listing cards into social feeds."""

from __future__ import annotations

from promotions.constants import PLACEMENT_MAX_SLOTS
from promotions.models import DEFAULT_SPONSORED_LABEL, PromotionPlacement, PromotionTargetType
from promotions.services import get_promoted_for_placement, has_blocking_reports

# 1-based positions 3 and 8 → 0-based insert indices
FEED_INJECT_INDICES = (2, 7)
MAX_PROMOTED_PER_FEED = 2

OPEN_REPORT_STATUSES = ("new", "under_review", "escalated")


def _has_blocking_reports(target_type: str, target_id: str) -> bool:
    return has_blocking_reports(target_type, target_id)


def _listing_report_id(listing_type: str, listing_id: int | str) -> str:
    return f"{listing_type}:{listing_id}"


def _default_sponsor_label(campaign) -> str:
    return campaign.label or DEFAULT_SPONSORED_LABEL


def _resolve_sponsored_post(campaign, *, require_delvers: bool | None, context) -> dict | None:
    from social.models import Post
    from social.serializers import PostSerializer

    try:
        pid = int(campaign.target_id)
    except (TypeError, ValueError):
        return None
    post = (
        Post.objects.filter(pk=pid, is_hidden=False)
        .exclude(is_accommodation_story=True)
        .select_related("author", "author__profile")
        .first()
    )
    if not post:
        return None
    if require_delvers is True and not post.is_delvers:
        return None
    if require_delvers is False and post.is_delvers:
        return None
    if _has_blocking_reports("post", str(pid)):
        return None
    row = PostSerializer(post, context=context).data
    row["feed_item_type"] = "post"
    row["is_sponsored"] = True
    row["sponsor_label"] = _default_sponsor_label(campaign)
    row["promotion_id"] = campaign.pk
    return row


def _build_listing_card(campaign, listing_type: str, listing_id: int, *, title: str, subtitle: str, image: str | None, meta: str, price: str) -> dict:
    href_map = {
        PromotionTargetType.ACCOMMODATION: f"/accommodation/{listing_id}",
        PromotionTargetType.GUIDE: f"/guides/{listing_id}",
        PromotionTargetType.FOOD: f"/food/{listing_id}",
        PromotionTargetType.EVENT: f"/events/{listing_id}",
        PromotionTargetType.VEHICLE: f"/transport/vehicle/{listing_id}",
        PromotionTargetType.BUS_TRIP: f"/transport/bus/{listing_id}",
    }
    return {
        "feed_item_type": "sponsored_listing",
        "id": f"sponsored-{campaign.pk}-{listing_type}-{listing_id}",
        "is_sponsored": True,
        "sponsor_label": _default_sponsor_label(campaign),
        "promotion_id": campaign.pk,
        "listing_type": listing_type,
        "listing_id": listing_id,
        "listing_title": title,
        "listing_subtitle": subtitle,
        "listing_image": image,
        "listing_meta": meta,
        "listing_price": price,
        "listing_href": href_map.get(listing_type, "/"),
    }


def _resolve_sponsored_listing(campaign, target_type: str) -> dict | None:
    try:
        lid = int(campaign.target_id)
    except (TypeError, ValueError):
        return None
    report_id = _listing_report_id(target_type, lid)
    if _has_blocking_reports("listing", report_id):
        return None

    if target_type == PromotionTargetType.ACCOMMODATION:
        from accommodation.models import AccommodationListing

        listing = AccommodationListing.objects.filter(pk=lid, is_active=True).first()
        if not listing:
            return None
        location = f"{listing.city}, {listing.region}".strip(", ") if listing.city else listing.region
        return _build_listing_card(
            campaign,
            target_type,
            lid,
            title=listing.title,
            subtitle=location,
            image=listing.cover_image.name if listing.cover_image else None,
            meta=listing.property_type or "Stay",
            price=f"From ${listing.price_per_night}/night",
        )

    if target_type == PromotionTargetType.GUIDE:
        from guides.models import TourGuideProfile

        from guides.provider_serializers import _photo_url

        guide = TourGuideProfile.objects.filter(pk=lid, is_active=True).select_related("user").first()
        if not guide:
            return None
        regions = ", ".join((guide.regions or [])[:2])
        rate = f"From ${guide.hourly_rate}/hr" if guide.hourly_rate else "View profile"
        image = _photo_url(guide)
        return _build_listing_card(
            campaign,
            target_type,
            lid,
            title=guide.headline,
            subtitle=regions or "Local guide",
            image=image,
            meta="Licensed guide" if guide.licensed_guide else "Local expert",
            price=rate,
        )

    if target_type == PromotionTargetType.FOOD:
        from food.models import FoodVenue

        venue = FoodVenue.objects.filter(pk=lid, is_active=True).first()
        if not venue:
            return None
        location = f"{venue.city}, {venue.region}".strip(", ") if venue.city else venue.region
        return _build_listing_card(
            campaign,
            target_type,
            lid,
            title=venue.name,
            subtitle=location,
            image=venue.cover_image.name if venue.cover_image else None,
            meta=venue.get_cuisine_display() if hasattr(venue, "get_cuisine_display") else venue.cuisine,
            price="$" * max(1, min(4, venue.price_level or 1)),
        )

    if target_type == PromotionTargetType.EVENT:
        from events_app.models import Event

        event = Event.objects.filter(pk=lid, is_published=True).first()
        if not event:
            return None
        location = f"{event.city}, {event.region}".strip(", ") if event.city else (event.region or event.venue)
        return _build_listing_card(
            campaign,
            target_type,
            lid,
            title=event.title,
            subtitle=location,
            image=event.cover_image.name if event.cover_image else None,
            meta=event.get_category_display() if hasattr(event, "get_category_display") else event.category,
            price="Free" if event.is_free else (f"N${event.price}" if event.price else "View event"),
        )

    if target_type == PromotionTargetType.VEHICLE:
        from transport.models import VehicleRentalListing

        vehicle = VehicleRentalListing.objects.filter(pk=lid, is_active=True).first()
        if not vehicle:
            return None
        location = f"{vehicle.city}, {vehicle.region}".strip(", ") if vehicle.city else vehicle.region
        return _build_listing_card(
            campaign,
            target_type,
            lid,
            title=vehicle.title or f"{vehicle.make} {vehicle.model}",
            subtitle=location,
            image=vehicle.cover_image.name if vehicle.cover_image else None,
            meta=vehicle.vehicle_type or "Vehicle rental",
            price=f"N${vehicle.price_per_day}/day",
        )

    if target_type == PromotionTargetType.BUS_TRIP:
        from django.utils import timezone
        from transport.models import BusTrip

        trip = (
            BusTrip.objects.filter(pk=lid, is_active=True, departs_at__gte=timezone.now())
            .select_related("route", "route__operator")
            .first()
        )
        if not trip:
            return None
        route = trip.route
        return _build_listing_card(
            campaign,
            target_type,
            lid,
            title=f"{route.origin} → {route.destination}",
            subtitle=route.operator.name,
            image=route.cover_image or None,
            meta="Shared bus trip",
            price=f"N${trip.price}",
        )

    return None


def _resolve_feed_promotion(campaign, *, require_delvers: bool | None, context) -> dict | None:
    if campaign.target_type == PromotionTargetType.POST:
        return _resolve_sponsored_post(campaign, require_delvers=require_delvers, context=context)
    return _resolve_sponsored_listing(campaign, campaign.target_type)


def inject_feed_promotions(
    organic: list[dict],
    *,
    placement: str,
    region: str = "",
    context=None,
) -> list[dict]:
    """Merge sponsored items at fixed positions; cap per page."""
    require_delvers: bool | None = None
    if placement == PromotionPlacement.DELVERS_FEED:
        require_delvers = True
    elif placement == PromotionPlacement.COMMUNITY_FEED:
        require_delvers = False

    max_slots = min(MAX_PROMOTED_PER_FEED, PLACEMENT_MAX_SLOTS.get(placement, MAX_PROMOTED_PER_FEED))
    campaigns = get_promoted_for_placement(placement, region, max_slots=max_slots)

    promoted: list[dict] = []
    promoted_post_ids: set[int] = set()

    for campaign in campaigns:
        row = _resolve_feed_promotion(campaign, require_delvers=require_delvers, context=context or {})
        if not row:
            continue
        if row.get("feed_item_type") == "post" and isinstance(row.get("id"), int):
            if row["id"] in promoted_post_ids:
                continue
            promoted_post_ids.add(row["id"])
        promoted.append(row)
        if len(promoted) >= MAX_PROMOTED_PER_FEED:
            break

    result = [row for row in organic if not (isinstance(row.get("id"), int) and row["id"] in promoted_post_ids)]

    for idx, item in enumerate(promoted[: len(FEED_INJECT_INDICES)]):
        insert_at = FEED_INJECT_INDICES[idx]
        if insert_at <= len(result):
            result.insert(insert_at, item)
        else:
            result.append(item)

    return result
