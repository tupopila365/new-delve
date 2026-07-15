"""Merge promotion campaigns into consumer-facing featured lists."""

from __future__ import annotations

from typing import Any, Callable

from django.db.models import Count, Exists, OuterRef, Q, QuerySet
from django.utils import timezone

from accommodation.models import AccommodationListing, AccommodationListingLike
from promotions.constants import (
    CATEGORY_SPOTLIGHT_TARGET,
    FEATURED_RAIL_LIMIT,
    MAX_PROMOTED_HOMEPAGE,
    PLACEMENT_MAX_SLOTS,
    PLACEMENT_TARGET_TYPES,
)
from promotions.analytics_services import rank_campaigns_by_engagement
from promotions.models import (
    DEFAULT_PARTNER_LABEL,
    PromotionCampaign,
    PromotionPlacement,
    PromotionStatus,
    PromotionTargetType,
)


OPEN_REPORT_STATUSES = ("new", "under_review", "escalated")


def has_blocking_reports(target_type: str, target_id: str) -> bool:
    from reports.models import Report

    return Report.objects.filter(
        target_type=target_type,
        target_id=str(target_id),
        status__in=OPEN_REPORT_STATUSES,
    ).exists()


def default_campaign_label(placement: str) -> str:
    from promotions.models import DEFAULT_PARTNER_LABEL, DEFAULT_SPONSORED_LABEL, PromotionPlacement

    if placement in (PromotionPlacement.DELVERS_FEED, PromotionPlacement.COMMUNITY_FEED):
        return DEFAULT_SPONSORED_LABEL
    return DEFAULT_PARTNER_LABEL


def get_promoted_for_placement(
    placement: str,
    region: str = "",
    *,
    max_slots: int | None = None,
    target_type: str | None = None,
) -> list[PromotionCampaign]:
    """Active campaigns for a placement, ordered by priority then start date."""
    region = (region or "").strip()
    now = timezone.now()
    qs = (
        PromotionCampaign.objects.filter(placement=placement)
        .exclude(
            status__in=[
                PromotionStatus.CANCELLED,
                PromotionStatus.REQUESTED,
                PromotionStatus.REJECTED,
                PromotionStatus.PENDING_PAYMENT,
                PromotionStatus.REFUNDED,
            ]
        )
        .filter(starts_at__lte=now, ends_at__gte=now)
    )
    if target_type:
        qs = qs.filter(target_type=target_type)
    if region:
        qs = qs.filter(Q(region="") | Q(region__iexact=region))
    else:
        qs = qs.filter(region="")
    campaigns = rank_campaigns_by_engagement(list(qs))
    cap = max_slots
    if cap is None:
        cap = PLACEMENT_MAX_SLOTS.get(placement, MAX_PROMOTED_HOMEPAGE)
    return campaigns[:cap]


def overlapping_campaigns(
    *,
    placement: str,
    starts_at,
    ends_at,
    region: str = "",
    exclude_id: int | None = None,
    target_type: str | None = None,
) -> list[PromotionCampaign]:
    """Scheduled/active campaigns whose window overlaps the proposed range."""
    region = (region or "").strip()
    qs = PromotionCampaign.objects.filter(placement=placement).exclude(
        status__in=[
            PromotionStatus.CANCELLED,
            PromotionStatus.REJECTED,
            PromotionStatus.REQUESTED,
            PromotionStatus.PENDING_PAYMENT,
            PromotionStatus.REFUNDED,
        ]
    )
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    if target_type:
        qs = qs.filter(target_type=target_type)
    qs = qs.filter(starts_at__lt=ends_at, ends_at__gt=starts_at)
    if region:
        qs = qs.filter(Q(region="") | Q(region__iexact=region))
    else:
        qs = qs.filter(region="")
    return list(qs.order_by("-priority", "-starts_at"))


def placement_conflict_summary(
    *,
    placement: str,
    starts_at,
    ends_at,
    region: str = "",
    exclude_id: int | None = None,
    target_type: str | None = None,
) -> dict[str, Any]:
    conflicts = overlapping_campaigns(
        placement=placement,
        starts_at=starts_at,
        ends_at=ends_at,
        region=region,
        exclude_id=exclude_id,
        target_type=target_type,
    )
    max_slots = PLACEMENT_MAX_SLOTS.get(placement, 2)
    booked = len(conflicts)
    warnings: list[str] = []
    if booked >= max_slots:
        warnings.append(f"All {max_slots} slot{'s' if max_slots != 1 else ''} already booked for this period.")
    elif booked == max_slots - 1:
        warnings.append(f"Slot {max_slots} is the only slot left for this period.")
    for idx, row in enumerate(conflicts[:max_slots], start=1):
        label = row.target_label or f"{row.target_type}:{row.target_id}"
        warnings.append(f"Slot {idx} booked — {label} ({row.starts_at.date()} → {row.ends_at.date()})")
    return {
        "placement": placement,
        "max_slots": max_slots,
        "booked_slots": min(booked, max_slots),
        "available_slots": max(0, max_slots - booked),
        "has_conflict": booked >= max_slots,
        "warnings": warnings,
        "conflicts": [
            {
                "id": c.pk,
                "target_label": c.target_label,
                "target_type": c.target_type,
                "target_id": c.target_id,
                "starts_at": c.starts_at,
                "ends_at": c.ends_at,
                "priority": c.priority,
                "region": c.region,
            }
            for c in conflicts
        ],
    }


def _annotate_partner(row: dict, campaign: PromotionCampaign) -> dict:
    row["is_featured_partner"] = True
    row["partner_label"] = campaign.label or DEFAULT_PARTNER_LABEL
    row["promotion_id"] = campaign.pk
    row["is_editorial_pin"] = False
    row["home_pin_id"] = None
    return row


def _annotate_editorial(row: dict, pin) -> dict:
    row["is_featured_partner"] = True
    row["partner_label"] = (pin.partner_label or pin.target_label or "Featured").strip() or "Featured"
    row["promotion_id"] = None
    row["is_editorial_pin"] = True
    row["home_pin_id"] = pin.pk
    row["_pin_target_type"] = pin.target_type
    return row


def _annotate_organic(row: dict) -> dict:
    row["is_featured_partner"] = False
    row["partner_label"] = ""
    row["is_editorial_pin"] = False
    row["home_pin_id"] = None
    return row


class _TargetRef:
    __slots__ = ("target_type", "target_id")

    def __init__(self, target_type: str, target_id: str):
        self.target_type = target_type
        self.target_id = str(target_id)


def active_home_pins(placement: str, region: str = ""):
    """Active editorial pins for a homepage placement, ordered."""
    from promotions.models import HOMEPAGE_PIN_PLACEMENTS, HomePin

    if placement not in HOMEPAGE_PIN_PLACEMENTS:
        return []
    now = timezone.now()
    qs = HomePin.objects.filter(placement=placement, is_active=True).order_by("sort_order", "id")
    qs = qs.filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now))
    qs = qs.filter(Q(ends_at__isnull=True) | Q(ends_at__gte=now))
    pins = list(qs)
    region = (region or "").strip().lower()
    if not region:
        return pins
    return [p for p in pins if not (p.region or "").strip() or region in (p.region or "").lower()]


def resolve_home_pin_rows(placement: str, *, region: str = "", user=None) -> list[dict]:
    rows: list[dict] = []
    seen: set[str | int] = set()
    for pin in active_home_pins(placement, region):
        ref = _TargetRef(pin.target_type, pin.target_id)
        row = _resolve_by_target_type(ref, pin.target_type, user)
        if not row:
            continue
        key = row.get("id", pin.target_id)
        if key in seen:
            continue
        seen.add(key)
        rows.append(_annotate_editorial(dict(row), pin))
    return rows


def _merge_promoted_with_organic(
    *,
    campaigns: list[PromotionCampaign],
    expected_target_type: str,
    resolve_listing: Callable[[PromotionCampaign], dict | None],
    organic_qs: QuerySet,
    serializer_class,
    user=None,
    limit: int = FEATURED_RAIL_LIMIT,
    region: str = "",
    region_filter_fields: tuple[str, ...] = ("region", "city"),
    editorial: list[dict] | None = None,
) -> list[dict]:
    promoted: list[dict] = list(editorial or [])
    promoted_keys: set[str | int] = {row.get("id") for row in promoted if row.get("id") is not None}

    for campaign in campaigns:
        if campaign.target_type != expected_target_type:
            continue
        row = resolve_listing(campaign)
        if not row:
            continue
        key = row.get("id", campaign.target_id)
        if key in promoted_keys:
            continue
        promoted_keys.add(key)
        promoted.append(_annotate_partner(row, campaign))

    organic_qs = organic_qs.exclude(pk__in={k for k in promoted_keys if isinstance(k, int)})
    if region:
        region_q = Q()
        for field in region_filter_fields:
            region_q |= Q(**{f"{field}__icontains": region})
        organic_qs = organic_qs.filter(region_q)

    remaining = max(0, limit - len(promoted))
    context = {"request": None}
    organic = serializer_class(organic_qs[:remaining], many=True, context=context).data
    return promoted + [_annotate_organic(dict(row)) for row in organic]


def _resolve_region(user=None, region: str = "") -> str:
    region = (region or "").strip()
    if not region and user and getattr(user, "is_authenticated", False):
        profile = getattr(user, "profile", None)
        region = (getattr(profile, "region", None) or "").strip()
    return region


def _accommodation_queryset(user=None):
    qs = AccommodationListing.objects.filter(is_active=True).select_related("owner")
    qs = qs.annotate(likes_count=Count("user_likes", distinct=True))
    if user and user.is_authenticated:
        qs = qs.annotate(
            liked_by_me=Exists(
                AccommodationListingLike.objects.filter(
                    listing_id=OuterRef("pk"),
                    user_id=user.id,
                )
            )
        )
    return qs


def _resolve_accommodation(campaign: PromotionCampaign, user=None) -> dict | None:
    from accommodation.serializers import AccommodationListingSerializer

    try:
        lid = int(campaign.target_id)
    except (TypeError, ValueError):
        return None
    listing = _accommodation_queryset(user).filter(pk=lid).first()
    if not listing:
        return None
    return AccommodationListingSerializer(listing, context={"request": None}).data


def _resolve_by_target_type(campaign: PromotionCampaign, target_type: str, user=None) -> dict | None:
    if target_type == PromotionTargetType.ACCOMMODATION:
        return _resolve_accommodation(campaign, user)
    if target_type == PromotionTargetType.GUIDE:
        from guides.models import TourGuideProfile
        from guides.serializers import TourGuideProfileSerializer

        try:
            gid = int(campaign.target_id)
        except (TypeError, ValueError):
            return None
        guide = TourGuideProfile.objects.filter(is_active=True, pk=gid).select_related("user", "user__profile").first()
        if not guide:
            return None
        return TourGuideProfileSerializer(guide, context={"request": None}).data
    if target_type == PromotionTargetType.FOOD:
        from food.models import FoodVenue
        from food.serializers import FoodVenueSerializer

        try:
            fid = int(campaign.target_id)
        except (TypeError, ValueError):
            return None
        venue = FoodVenue.objects.filter(is_active=True, pk=fid).select_related("owner").first()
        if not venue:
            return None
        return FoodVenueSerializer(venue, context={"request": None}).data
    if target_type == PromotionTargetType.EVENT:
        from events_app.models import Event
        from events_app.serializers import EventSerializer

        try:
            eid = int(campaign.target_id)
        except (TypeError, ValueError):
            return None
        event = Event.objects.filter(is_published=True, pk=eid).select_related("organizer").first()
        if not event:
            return None
        return EventSerializer(event, context={"request": None}).data
    if target_type == PromotionTargetType.VEHICLE:
        from transport.models import VehicleRentalListing
        from transport.serializers import VehicleRentalListingSerializer

        try:
            vid = int(campaign.target_id)
        except (TypeError, ValueError):
            return None
        vehicle = VehicleRentalListing.objects.filter(is_active=True, pk=vid).select_related("owner").first()
        if not vehicle:
            return None
        return VehicleRentalListingSerializer(vehicle, context={"request": None}).data
    if target_type == PromotionTargetType.BUS_TRIP:
        from django.utils import timezone
        from transport.models import BusTrip
        from transport.serializers import BusTripSerializer

        try:
            tid = int(campaign.target_id)
        except (TypeError, ValueError):
            return None
        trip = (
            BusTrip.objects.filter(is_active=True, pk=tid, departs_at__gte=timezone.now())
            .select_related("route", "route__operator")
            .first()
        )
        if not trip:
            return None
        return BusTripSerializer(trip, context={"request": None}).data
    return None


def _filter_guide_queryset_by_region(qs: QuerySet, region: str) -> QuerySet:
    """TourGuideProfile stores regions as JSON list — filter in Python for portability."""
    region_lower = region.lower()
    ids = [row.pk for row in qs if any(region_lower in str(r).lower() for r in (row.regions or []))]
    return qs.filter(pk__in=ids) if ids else qs.none()


def featured_for_placement(
    placement: str,
    *,
    region: str = "",
    user=None,
    limit: int = FEATURED_RAIL_LIMIT,
    target_type: str | None = None,
) -> list[dict]:
    region = _resolve_region(user, region)
    campaigns = get_promoted_for_placement(placement, region, target_type=target_type)
    editorial = resolve_home_pin_rows(placement, region=region, user=user)

    if placement == PromotionPlacement.HOMEPAGE_STAYS:
        from accommodation.serializers import AccommodationListingSerializer

        return _merge_promoted_with_organic(
            campaigns=campaigns,
            expected_target_type=PromotionTargetType.ACCOMMODATION,
            resolve_listing=lambda c: _resolve_accommodation(c, user),
            organic_qs=_accommodation_queryset(user).order_by("-created_at"),
            serializer_class=AccommodationListingSerializer,
            user=user,
            limit=limit,
            region=region,
            editorial=editorial,
        )

    if placement == PromotionPlacement.HOMEPAGE_GUIDES:
        from guides.models import TourGuideProfile
        from guides.serializers import TourGuideProfileSerializer

        organic_qs = TourGuideProfile.objects.filter(is_active=True).select_related("user", "user__profile").order_by(
            "-created_at"
        )
        if region:
            organic_qs = _filter_guide_queryset_by_region(organic_qs, region)

        return _merge_promoted_with_organic(
            campaigns=campaigns,
            expected_target_type=PromotionTargetType.GUIDE,
            resolve_listing=lambda c: _resolve_by_target_type(c, PromotionTargetType.GUIDE, user),
            organic_qs=organic_qs,
            serializer_class=TourGuideProfileSerializer,
            user=user,
            limit=limit,
            region="",
            editorial=editorial,
        )

    if placement == PromotionPlacement.HOMEPAGE_FOOD:
        from food.models import FoodVenue
        from food.serializers import FoodVenueSerializer

        return _merge_promoted_with_organic(
            campaigns=campaigns,
            expected_target_type=PromotionTargetType.FOOD,
            resolve_listing=lambda c: _resolve_by_target_type(c, PromotionTargetType.FOOD, user),
            organic_qs=FoodVenue.objects.filter(is_active=True).select_related("owner").order_by("name"),
            serializer_class=FoodVenueSerializer,
            user=user,
            limit=limit,
            region=region,
            editorial=editorial,
        )

    if placement == PromotionPlacement.HOMEPAGE_EVENTS:
        from events_app.models import Event
        from events_app.serializers import EventSerializer

        return _merge_promoted_with_organic(
            campaigns=campaigns,
            expected_target_type=PromotionTargetType.EVENT,
            resolve_listing=lambda c: _resolve_by_target_type(c, PromotionTargetType.EVENT, user),
            organic_qs=Event.objects.filter(is_published=True).select_related("organizer").order_by("starts_at"),
            serializer_class=EventSerializer,
            user=user,
            limit=limit,
            region=region,
            editorial=editorial,
        )

    if placement == PromotionPlacement.CATEGORY_SPOTLIGHT and target_type:
        campaigns = get_promoted_for_placement(
            placement,
            region,
            max_slots=1,
            target_type=target_type,
        )
        for campaign in campaigns:
            row = _resolve_by_target_type(campaign, target_type, user)
            if row:
                return [_annotate_partner(row, campaign)]
        return []

    return []


def homepage_stays_featured(*, region: str = "", user=None, limit: int = FEATURED_RAIL_LIMIT):
    return featured_for_placement(PromotionPlacement.HOMEPAGE_STAYS, region=region, user=user, limit=limit)


def category_spotlight(*, category: str, region: str = "", user=None) -> list[dict]:
    target_type = CATEGORY_SPOTLIGHT_TARGET.get((category or "").strip().lower())
    if not target_type:
        return []
    return featured_for_placement(
        PromotionPlacement.CATEGORY_SPOTLIGHT,
        region=region,
        user=user,
        limit=1,
        target_type=target_type,
    )


def validate_target_listing(target_type: str, target_id: str, *, placement: str = "") -> tuple[bool, str, str]:
    """Return (ok, label, error)."""
    try:
        lid = int(target_id)
    except (TypeError, ValueError):
        return False, "", "Invalid listing id."

    if target_type == PromotionTargetType.POST:
        from social.models import Post

        post = Post.objects.filter(pk=lid).exclude(is_accommodation_story=True).first()
        if not post or post.is_hidden:
            return False, "", "Visible post not found."
        if has_blocking_reports("post", str(lid)):
            return False, "", "Post has open reports and cannot be promoted."
        if placement == PromotionPlacement.DELVERS_FEED and not post.is_delvers:
            return False, "", "Delvers feed requires a Delvers post."
        if placement == PromotionPlacement.COMMUNITY_FEED and post.is_delvers:
            return False, "", "Community feed requires a community post (not Delvers)."
        label = (post.body or post.delvers_board or f"Post #{lid}")[:80]
        return True, label, ""

    report_key = f"{target_type}:{lid}"
    if has_blocking_reports("listing", report_key):
        return False, "", "Listing has open reports and cannot be promoted."

    if target_type == PromotionTargetType.ACCOMMODATION:
        listing = AccommodationListing.objects.filter(pk=lid, is_active=True).first()
        if not listing:
            return False, "", "Active stay listing not found."
        return True, listing.title, ""

    if target_type == PromotionTargetType.GUIDE:
        from guides.models import TourGuideProfile

        guide = TourGuideProfile.objects.filter(pk=lid, is_active=True).first()
        if not guide:
            return False, "", "Active guide profile not found."
        return True, guide.headline, ""

    if target_type == PromotionTargetType.FOOD:
        from food.models import FoodVenue

        venue = FoodVenue.objects.filter(pk=lid, is_active=True).first()
        if not venue:
            return False, "", "Active food venue not found."
        return True, venue.name, ""

    if target_type == PromotionTargetType.EVENT:
        from events_app.models import Event

        event = Event.objects.filter(pk=lid, is_published=True).first()
        if not event:
            return False, "", "Published event not found."
        return True, event.title, ""

    if target_type == PromotionTargetType.VEHICLE:
        from transport.models import VehicleRentalListing

        vehicle = VehicleRentalListing.objects.filter(pk=lid, is_active=True).first()
        if not vehicle:
            return False, "", "Active vehicle listing not found."
        return True, vehicle.title or f"{vehicle.make} {vehicle.model}", ""

    if target_type == PromotionTargetType.BUS_TRIP:
        from django.utils import timezone
        from transport.models import BusTrip

        trip = BusTrip.objects.filter(pk=lid, is_active=True).select_related("route").first()
        if not trip:
            return False, "", "Active bus trip not found."
        if trip.departs_at < timezone.now():
            return False, "", "Bus trip has already departed."
        label = f"{trip.route.origin} → {trip.route.destination}"
        return True, label, ""

    return False, "", "Unsupported target type."


def allowed_target_types_for_placement(placement: str) -> list[str]:
    return PLACEMENT_TARGET_TYPES.get(placement, [])
