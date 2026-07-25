"""Compact travel-offer payloads for listing cards and detail strips (Phase 1 + 3)."""

from __future__ import annotations

from typing import Any, Iterable

from .deal_eligibility import eligibility_fields_payload, enriched_eligibility_display
from .models import BusinessProfile, TravelOffer, TravelOfferEligibility, TravelOfferKind
from .travel_partners import public_offers_q


# Maps listing vertical → TravelOffer.categories tags (empty categories = all verticals).
DEAL_CATEGORY_ALIASES: dict[str, set[str]] = {
    "stays": {"stays", "accommodation", "stay"},
    "food": {"food", "foodies", "food_drink"},
    "guides": {"guides", "guide"},
    "transport": {"transport", "vehicles", "bus"},
    "events": {"events", "event"},
    "shop": {"shop", "shops", "retail"},
    "activities": {"activities", "activity"},
}


def _norm_cats(raw: Any) -> set[str]:
    if not isinstance(raw, list):
        return set()
    return {str(c).strip().lower() for c in raw if str(c).strip()}


def offer_matches_category(offer: TravelOffer, category: str) -> bool:
    """True when the offer applies to this vertical (or has no category filter)."""
    cats = _norm_cats(offer.categories)
    if not cats:
        return True
    aliases = DEAL_CATEGORY_ALIASES.get(category, {category})
    return bool(cats & aliases)


def deal_badge_label(offer: TravelOffer) -> str:
    """Short pill text for cards."""
    price = (offer.price_label or "").strip()
    if price:
        return price[:40]
    custom = (offer.eligibility_label or "").strip()
    if offer.eligibility == TravelOfferEligibility.CUSTOM and custom:
        return custom[:32]
    from .deal_eligibility import age_range_label

    age = age_range_label(offer.min_age, offer.max_age)
    if age and offer.eligibility in (
        TravelOfferEligibility.EVERYONE,
        TravelOfferEligibility.CUSTOM,
    ):
        return age[:32]
    if offer.eligibility == TravelOfferEligibility.STUDENT:
        return "Student"
    if offer.eligibility == TravelOfferEligibility.SADC:
        return "SADC"
    if offer.eligibility == TravelOfferEligibility.LOCAL:
        return "Local"
    if offer.offer_kind == TravelOfferKind.PACKAGE:
        return "Package"
    if offer.offer_kind == TravelOfferKind.ELIGIBILITY:
        return "Special rate"
    if offer.offer_kind == TravelOfferKind.DISCOUNT:
        return "Discount"
    title = (offer.title or "").strip()
    return (title[:28] + "…") if len(title) > 28 else (title or "Deal")


def deal_badge_kind(offer: TravelOffer) -> str:
    """CSS/visual variant: sale | eligibility | package | discount."""
    if offer.offer_kind == TravelOfferKind.PACKAGE:
        return "package"
    if offer.eligibility != TravelOfferEligibility.EVERYONE:
        return "eligibility"
    if offer.min_age is not None or offer.max_age is not None:
        return "eligibility"
    if offer.offer_kind == TravelOfferKind.ELIGIBILITY:
        return "eligibility"
    price = (offer.price_label or "").lower()
    if "%" in price or "off" in price or "sale" in price:
        return "sale"
    return "discount"


def compact_deal_payload(offer: TravelOffer, *, viewer_profile=None) -> dict[str, Any]:
    eligibility_display = enriched_eligibility_display(offer)
    payload = {
        "id": offer.pk,
        "source": "travel_offer",
        "business_id": offer.business_id,
        "title": offer.title,
        "summary": offer.summary or "",
        "offer_kind": offer.offer_kind,
        "eligibility": offer.eligibility,
        "eligibility_display": eligibility_display,
        "price_label": (offer.price_label or "").strip(),
        "badge": deal_badge_label(offer),
        "badge_kind": deal_badge_kind(offer),
        "how_to_claim": offer.how_to_claim or "",
        "proof_required": offer.proof_required or "",
        "details": offer.details or "",
        "terms_note": offer.terms_note or "",
        "starts_on": offer.starts_on.isoformat() if offer.starts_on else None,
        "ends_on": offer.ends_on.isoformat() if offer.ends_on else None,
    }
    payload.update(eligibility_fields_payload(offer, viewer_profile))
    return payload


def build_deals_by_owner(
    owner_ids: Iterable[int],
    category: str,
    *,
    limit_per_owner: int = 4,
    viewer_profile=None,
) -> dict[int, list[dict[str, Any]]]:
    """Batch-load active offers for listing owners, filtered by vertical category."""
    ids = sorted({int(i) for i in owner_ids if i})
    if not ids:
        return {}

    businesses = BusinessProfile.objects.filter(owner_id__in=ids).only("id", "owner_id")
    owner_by_biz = {b.id: b.owner_id for b in businesses}
    if not owner_by_biz:
        return {oid: [] for oid in ids}

    offers = (
        TravelOffer.objects.filter(business_id__in=owner_by_biz.keys())
        .filter(public_offers_q())
        .order_by("sort_order", "id")
    )

    out: dict[int, list[dict[str, Any]]] = {oid: [] for oid in ids}
    for offer in offers:
        owner_id = owner_by_biz.get(offer.business_id)
        if owner_id is None:
            continue
        if not offer_matches_category(offer, category):
            continue
        bucket = out.setdefault(owner_id, [])
        if len(bucket) >= limit_per_owner:
            continue
        bucket.append(compact_deal_payload(offer, viewer_profile=viewer_profile))
    return out


def build_deals_by_business(
    business_ids: Iterable[int],
    category: str,
    *,
    limit_per_business: int = 4,
    viewer_profile=None,
) -> dict[int, list[dict[str, Any]]]:
    """Batch-load active offers keyed by BusinessProfile id."""
    ids = sorted({int(i) for i in business_ids if i})
    if not ids:
        return {}

    offers = (
        TravelOffer.objects.filter(business_id__in=ids)
        .filter(public_offers_q())
        .order_by("sort_order", "id")
    )
    out: dict[int, list[dict[str, Any]]] = {bid: [] for bid in ids}
    for offer in offers:
        if not offer_matches_category(offer, category):
            continue
        bucket = out.setdefault(offer.business_id, [])
        if len(bucket) >= limit_per_business:
            continue
        bucket.append(compact_deal_payload(offer, viewer_profile=viewer_profile))
    return out


def deals_for_listing(obj, context: dict, category: str) -> list[dict[str, Any]]:
    """Merge listing-level sales (Phase 2) ahead of business travel offers (Phase 1)."""
    viewer_profile = context.get("deal_viewer_profile")
    listing_id = getattr(obj, "pk", None) or getattr(obj, "id", None)
    sales_map = context.get("listing_sales_by_id")
    listing_sales: list[dict[str, Any]] = []
    if listing_id and isinstance(sales_map, dict):
        listing_sales = list(sales_map.get(int(listing_id), []))
    elif listing_id:
        from accounts.listing_sales import build_listing_sales_by_id

        listing_sales = build_listing_sales_by_id(category, [int(listing_id)]).get(int(listing_id), [])

    by_business = context.get("deals_by_business")
    business_id = getattr(obj, "business_id", None)
    if business_id and isinstance(by_business, dict):
        business_deals = by_business.get(int(business_id), [])
        return (listing_sales + business_deals)[:4]
    if business_id and by_business is None and not getattr(obj, "owner_id", None):
        business_deals = build_deals_by_business(
            [int(business_id)], category, viewer_profile=viewer_profile
        ).get(int(business_id), [])
        return (listing_sales + business_deals)[:4]

    owner_id = getattr(obj, "owner_id", None)
    if owner_id is None:
        owner = getattr(obj, "owner", None)
        owner_id = getattr(owner, "id", None) if owner is not None else None
    # Guides: TourGuideProfile.user
    if owner_id is None:
        user = getattr(obj, "user", None)
        owner_id = getattr(user, "id", None) if user is not None else getattr(obj, "user_id", None)
    # Events: organizer
    if owner_id is None:
        organizer = getattr(obj, "organizer", None)
        owner_id = getattr(organizer, "id", None) if organizer is not None else getattr(obj, "organizer_id", None)

    if not owner_id:
        if business_id:
            business_deals = build_deals_by_business(
                [int(business_id)], category, viewer_profile=viewer_profile
            ).get(int(business_id), [])
            return (listing_sales + business_deals)[:4]
        return listing_sales[:4]

    by_owner = context.get("deals_by_owner")
    if isinstance(by_owner, dict):
        business_deals = by_owner.get(int(owner_id), [])
    else:
        business_deals = build_deals_by_owner(
            [int(owner_id)], category, viewer_profile=viewer_profile
        ).get(int(owner_id), [])
    return (listing_sales + business_deals)[:4]


class ListingDealsContextMixin:
    """DRF view mixin: preload compact travel-offer deals into serializer context."""

    deal_category: str = "stays"
    # "owner" → owner_id / user_id; "business" → business_id (events)
    deal_scope: str = "owner"

    def get_serializer_context(self):
        ctx = super().get_serializer_context()  # type: ignore[misc]
        ctx.setdefault("deal_category", self.deal_category)
        request = ctx.get("request")
        user = getattr(request, "user", None) if request is not None else None
        profile = None
        if user is not None and getattr(user, "is_authenticated", False):
            profile = getattr(user, "profile", None)
        ctx["deal_viewer_profile"] = profile
        return ctx

    def get_serializer(self, *args, **kwargs):
        instance = args[0] if args else kwargs.get("instance")
        many = kwargs.get("many", False)
        context = kwargs.setdefault("context", self.get_serializer_context())
        if instance is not None:
            instances = list(instance) if many else [instance]
            self._attach_deals_context(context, instances)
        return super().get_serializer(*args, **kwargs)  # type: ignore[misc]

    def _attach_deals_context(self, context: dict, instances: list) -> None:
        from accounts.listing_sales import build_listing_sales_by_id

        listing_ids = [getattr(obj, "pk", None) for obj in instances]
        context["listing_sales_by_id"] = build_listing_sales_by_id(self.deal_category, listing_ids)
        viewer = context.get("deal_viewer_profile")

        if self.deal_scope == "business":
            ids = [getattr(obj, "business_id", None) for obj in instances]
            context["deals_by_business"] = build_deals_by_business(
                ids, self.deal_category, viewer_profile=viewer
            )
            return
        ids = []
        for obj in instances:
            oid = getattr(obj, "owner_id", None)
            if oid is None:
                oid = getattr(obj, "user_id", None)
            if oid is None:
                oid = getattr(obj, "organizer_id", None)
            ids.append(oid)
        context["deals_by_owner"] = build_deals_by_owner(
            ids, self.deal_category, viewer_profile=viewer
        )
