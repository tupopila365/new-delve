"""Listing-level sales (Phase 2) — ownership checks and compact deal payloads."""

from __future__ import annotations

from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

from django.db.models import Q

from .models import ListingSale, ListingSaleVertical


VERTICAL_CHOICES = {c.value for c in ListingSaleVertical}


def public_listing_sales_q(as_of: date | None = None) -> Q:
    day = as_of or date.today()
    return Q(is_active=True) & (Q(starts_on__isnull=True) | Q(starts_on__lte=day)) & (
        Q(ends_on__isnull=True) | Q(ends_on__gte=day)
    )


def _pct_off(sale: Decimal, compare: Decimal) -> int | None:
    if compare <= 0 or sale >= compare:
        return None
    return int(round((1 - (sale / compare)) * 100))


def listing_sale_badge(sale: ListingSale) -> str:
    custom = (sale.badge or "").strip()
    if custom:
        return custom[:40]
    price_label = (sale.price_label or "").strip()
    if price_label:
        return price_label[:40]
    if sale.sale_price is not None and sale.compare_at_price is not None:
        pct = _pct_off(sale.sale_price, sale.compare_at_price)
        if pct and pct > 0:
            return f"{pct}% off"
    if sale.sale_price is not None:
        return "Sale"
    return (sale.title or "Sale")[:40]


def compact_listing_sale_payload(sale: ListingSale, *, business_id: int | None = None) -> dict[str, Any]:
    badge = listing_sale_badge(sale)
    how = (sale.how_to_claim or "").strip() or (
        "Book this listing while the sale is active — the discounted price is shown on the listing."
    )
    price_label = (sale.price_label or "").strip()
    if not price_label and sale.sale_price is not None and sale.compare_at_price is not None:
        pct = _pct_off(sale.sale_price, sale.compare_at_price)
        if pct and pct > 0:
            price_label = f"{pct}% off"
    elif not price_label and sale.sale_price is not None:
        price_label = str(sale.sale_price)

    return {
        "id": f"sale-{sale.pk}",
        "sale_id": sale.pk,
        "source": "listing_sale",
        "business_id": business_id or 0,
        "vertical": sale.vertical,
        "listing_id": sale.listing_id,
        "title": sale.title or "On sale",
        "summary": price_label,
        "offer_kind": "discount",
        "eligibility": "everyone",
        "eligibility_display": "Everyone",
        "price_label": price_label,
        "sale_price": str(sale.sale_price) if sale.sale_price is not None else None,
        "compare_at_price": str(sale.compare_at_price) if sale.compare_at_price is not None else None,
        "badge": badge,
        "badge_kind": "sale",
        "how_to_claim": how,
        "proof_required": sale.proof_required or "",
        "details": "",
        "terms_note": sale.terms_note or "",
        "starts_on": sale.starts_on.isoformat() if sale.starts_on else None,
        "ends_on": sale.ends_on.isoformat() if sale.ends_on else None,
        "listing_href": _listing_href(sale.vertical, sale.listing_id),
        "min_age": None,
        "max_age": None,
        "min_party_size": None,
        "max_party_size": None,
        "age_label": None,
        "party_label": None,
        "may_qualify": True,
        "qualify_hint": "Open to everyone while the sale is active",
    }


def _listing_href(vertical: str, listing_id: int) -> str:
    paths = {
        "stays": f"/accommodation/{listing_id}",
        "food": f"/food/{listing_id}",
        "guides": f"/guides/{listing_id}",
        "transport": f"/transport/vehicle/{listing_id}",
        "events": f"/events/{listing_id}",
        "shop": f"/shop/{listing_id}",
        "activities": f"/activities/{listing_id}",
    }
    return paths.get(vertical, "/")


def build_listing_sales_by_id(
    vertical: str,
    listing_ids: list[int | None],
    *,
    limit_per_listing: int = 1,
) -> dict[int, list[dict[str, Any]]]:
    ids = sorted({int(i) for i in listing_ids if i})
    if not ids or vertical not in VERTICAL_CHOICES:
        return {}
    sales = (
        ListingSale.objects.filter(vertical=vertical, listing_id__in=ids)
        .filter(public_listing_sales_q())
        .order_by("-updated_at", "id")
    )
    out: dict[int, list[dict[str, Any]]] = {i: [] for i in ids}
    for sale in sales:
        bucket = out.setdefault(sale.listing_id, [])
        if len(bucket) >= limit_per_listing:
            continue
        bucket.append(compact_listing_sale_payload(sale))
    return out


def get_listing_for_owner(vertical: str, listing_id: int, user):
    """Return the listing object if `user` may manage it, else None."""
    if vertical == "stays":
        from accommodation.models import AccommodationListing

        return AccommodationListing.objects.filter(pk=listing_id, owner=user).first()
    if vertical == "food":
        from food.models import FoodVenue

        return FoodVenue.objects.filter(pk=listing_id, owner=user).first()
    if vertical == "guides":
        from guides.models import TourGuideProfile

        return TourGuideProfile.objects.filter(pk=listing_id, user=user).first()
    if vertical == "transport":
        from transport.models import VehicleRentalListing

        return VehicleRentalListing.objects.filter(pk=listing_id, owner=user).first()
    if vertical == "events":
        from events_app.models import Event

        return Event.objects.filter(pk=listing_id, organizer=user).first()
    if vertical == "shop":
        from shop.models import ShopProduct

        return ShopProduct.objects.filter(pk=listing_id, owner=user).first()
    if vertical == "activities":
        from activities.models import ActivityListing

        return ActivityListing.objects.filter(pk=listing_id, owner=user).first()
    return None


def parse_optional_decimal(value) -> Decimal | None:
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None
