"""Phase 4 — public deals discovery (rails + search filters)."""

from __future__ import annotations

from typing import Any

from django.db.models import Q

from .deal_eligibility import eligibility_fields_payload, enriched_eligibility_display
from .listing_deals import DEAL_CATEGORY_ALIASES, deal_badge_kind, deal_badge_label, offer_matches_category
from .listing_sales import compact_listing_sale_payload, public_listing_sales_q
from .models import ListingSale, TravelOffer
from .travel_partners import public_offers_q


def _business_cover(business) -> str | None:
    cover = getattr(business, "cover_image", None)
    if cover:
        try:
            return cover.url
        except Exception:
            return str(cover)
    logo = getattr(business, "logo", None)
    if logo:
        try:
            return logo.url
        except Exception:
            return str(logo)
    return None


def discovery_offer_card(offer: TravelOffer, *, viewer_profile=None) -> dict[str, Any]:
    business = offer.business
    payload = {
        "id": f"offer-{offer.pk}",
        "offer_id": offer.pk,
        "source": "travel_offer",
        "title": offer.title,
        "summary": offer.summary or "",
        "offer_kind": offer.offer_kind,
        "eligibility": offer.eligibility,
        "eligibility_display": enriched_eligibility_display(offer),
        "price_label": (offer.price_label or "").strip(),
        "badge": deal_badge_label(offer),
        "badge_kind": deal_badge_kind(offer),
        "how_to_claim": offer.how_to_claim or "",
        "proof_required": offer.proof_required or "",
        "details": offer.details or "",
        "terms_note": offer.terms_note or "",
        "starts_on": offer.starts_on.isoformat() if offer.starts_on else None,
        "ends_on": offer.ends_on.isoformat() if offer.ends_on else None,
        "categories": list(offer.categories or []),
        "business_id": business.id,
        "business_name": business.business_name,
        "business_city": business.city or "",
        "business_region": business.region or "",
        "cover_image": (offer.cover_image or "").strip() or _business_cover(business),
        "href": f"/business/{business.id}/offers/{offer.pk}",
    }
    payload.update(eligibility_fields_payload(offer, viewer_profile))
    return payload


def _listing_cover(vertical: str, listing_id: int) -> str | None:
    """Best-effort cover URL for a sale's target listing."""
    try:
        if vertical == "stays":
            from accommodation.models import AccommodationListing

            row = AccommodationListing.objects.filter(pk=listing_id).only("cover_image").first()
            if row and row.cover_image:
                return str(row.cover_image).strip() or None
        if vertical == "food":
            from food.models import FoodVenue

            row = FoodVenue.objects.filter(pk=listing_id).only("cover_image").first()
            if row and row.cover_image:
                try:
                    return row.cover_image.url
                except Exception:
                    return str(row.cover_image).strip() or None
        if vertical == "transport":
            from transport.models import VehicleRentalListing

            row = VehicleRentalListing.objects.filter(pk=listing_id).only("cover_image").first()
            if row and row.cover_image:
                try:
                    return row.cover_image.url
                except Exception:
                    return str(row.cover_image).strip() or None
        if vertical == "events":
            from events_app.models import Event

            row = Event.objects.filter(pk=listing_id).only("cover_image").first()
            if row and row.cover_image:
                return str(row.cover_image).strip() or None
        if vertical == "shop":
            from shop.models import ShopProduct

            row = ShopProduct.objects.filter(pk=listing_id).only("cover_image").first()
            if row and row.cover_image:
                try:
                    return row.cover_image.url
                except Exception:
                    return str(row.cover_image).strip() or None
        if vertical == "activities":
            from activities.models import ActivityListing

            row = ActivityListing.objects.filter(pk=listing_id).only("cover_image", "media_gallery").first()
            if not row:
                return None
            cover = (row.cover_image or "").strip()
            if cover:
                return cover
            gallery = row.media_gallery or []
            if gallery:
                first = gallery[0]
                if isinstance(first, dict):
                    return (first.get("src") or "").strip() or None
                if isinstance(first, str):
                    return first.strip() or None
        if vertical == "guides":
            from guides.models import TourGuideProfile
            from guides.provider_serializers import _photo_url

            row = TourGuideProfile.objects.filter(pk=listing_id).first()
            return _photo_url(row) if row else None
    except Exception:
        return None
    return None


def discovery_sale_card(sale: ListingSale) -> dict[str, Any]:
    base = compact_listing_sale_payload(sale)
    biz = None
    try:
        from .models import BusinessProfile

        biz = BusinessProfile.objects.filter(owner_id=sale.owner_id).first()
    except Exception:
        biz = None
    cover = _listing_cover(sale.vertical, sale.listing_id)
    if not cover and biz:
        cover = _business_cover(biz)
    return {
        **base,
        "offer_id": None,
        "categories": [sale.vertical],
        "business_id": biz.id if biz else base.get("business_id") or 0,
        "business_name": (biz.business_name if biz else "") or "",
        "business_city": (biz.city if biz else "") or "",
        "business_region": (biz.region if biz else "") or "",
        "cover_image": cover,
        "href": base.get("listing_href") or "/",
    }


def _match_kind(card: dict[str, Any], kind: str) -> bool:
    k = kind.strip().lower()
    if not k:
        return True
    if k in ("sale", "discount", "eligibility", "package"):
        return (card.get("badge_kind") or "") == k or (card.get("offer_kind") or "") == k
    return True


def _match_text(card: dict[str, Any], q: str) -> bool:
    needle = q.strip().lower()
    if not needle:
        return True
    hay = " ".join(
        str(card.get(k) or "")
        for k in (
            "title",
            "summary",
            "badge",
            "price_label",
            "eligibility_display",
            "business_name",
            "business_city",
            "business_region",
            "how_to_claim",
        )
    ).lower()
    return needle in hay


def discover_deals(
    *,
    category: str = "",
    eligibility: str = "",
    kind: str = "",
    q: str = "",
    region: str = "",
    city: str = "",
    may_qualify_only: bool = False,
    include_listing_sales: bool = True,
    limit: int = 24,
    viewer_profile=None,
) -> list[dict[str, Any]]:
    """Return compact discovery cards for Home rails and /deals browse."""
    limit = max(1, min(int(limit or 24), 60))
    category = (category or "").strip().lower()
    eligibility = (eligibility or "").strip().lower()
    region = (region or "").strip()
    city = (city or "").strip()

    offer_qs = (
        TravelOffer.objects.filter(public_offers_q())
        .select_related("business", "business__owner")
        .order_by("sort_order", "id")
    )
    if eligibility:
        offer_qs = offer_qs.filter(eligibility=eligibility)
    if region:
        offer_qs = offer_qs.filter(
            Q(business__region__icontains=region) | Q(business__city__icontains=region)
        )
    if city:
        offer_qs = offer_qs.filter(business__city__icontains=city)

    cards: list[dict[str, Any]] = []
    for offer in offer_qs:
        if category and not offer_matches_category(offer, category):
            continue
        card = discovery_offer_card(offer, viewer_profile=viewer_profile)
        if not _match_kind(card, kind):
            continue
        if not _match_text(card, q):
            continue
        if may_qualify_only and card.get("may_qualify") is False:
            continue
        cards.append(card)
        if len(cards) >= limit:
            return cards

    if include_listing_sales and len(cards) < limit:
        sale_qs = ListingSale.objects.filter(public_listing_sales_q()).order_by("-updated_at", "id")
        if category and category in DEAL_CATEGORY_ALIASES:
            sale_qs = sale_qs.filter(vertical=category)
        elif category:
            sale_qs = sale_qs.filter(vertical=category)
        if eligibility and eligibility != "everyone":
            # Listing sales are everyone-only
            sale_qs = sale_qs.none()
        for sale in sale_qs[: max(limit * 2, 20)]:
            card = discovery_sale_card(sale)
            if not _match_kind(card, kind or "sale"):
                if kind and kind.strip().lower() not in ("", "sale", "discount"):
                    continue
            if not _match_text(card, q):
                continue
            if may_qualify_only and card.get("may_qualify") is False:
                continue
            cards.append(card)
            if len(cards) >= limit:
                break

    # Prefer deals the viewer may qualify for when browsing the rail
    if viewer_profile is not None:
        cards.sort(
            key=lambda c: (
                0 if c.get("may_qualify") is True else 1 if c.get("may_qualify") is None else 2,
                c.get("title") or "",
            )
        )
    return cards[:limit]
