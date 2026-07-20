"""Travel partners / accessible offers — shared query helpers and validation."""

from __future__ import annotations

from datetime import date
from urllib.parse import urlparse

from django.db.models import Exists, OuterRef, Q, QuerySet

from .models import BusinessProfile, TravelOffer


def today() -> date:
    return date.today()


def public_offers_q(as_of: date | None = None) -> Q:
    """Active offers that are within their optional start/end window."""
    day = as_of or today()
    return Q(is_active=True) & (Q(starts_on__isnull=True) | Q(starts_on__lte=day)) & (
        Q(ends_on__isnull=True) | Q(ends_on__gte=day)
    )


def public_offers_qs(business: BusinessProfile | None = None, as_of: date | None = None) -> QuerySet[TravelOffer]:
    qs = TravelOffer.objects.filter(public_offers_q(as_of)).select_related("business", "business__owner")
    if business is not None:
        qs = qs.filter(business=business)
    return qs.order_by("sort_order", "id")


def travel_partner_q(as_of: date | None = None) -> Q:
    """Businesses that should appear in the travel partners directory."""
    active = TravelOffer.objects.filter(business_id=OuterRef("pk")).filter(public_offers_q(as_of))
    return (
        Q(showcase_as_partner=True)
        | ~Q(how_we_help="")
        | ~Q(community_impact="")
        | Exists(active)
    )


def travel_partners_qs(as_of: date | None = None) -> QuerySet[BusinessProfile]:
    return (
        BusinessProfile.objects.select_related("owner")
        .prefetch_related("travel_offers")
        .filter(travel_partner_q(as_of))
        .distinct()
        .order_by("business_name")
    )


def is_allowed_media_url(value: str) -> bool:
    """Accept http(s) URLs or relative/media paths used by Delve uploads."""
    src = (value or "").strip()
    if not src or len(src) > 2000:
        return False
    if src.startswith("/") or src.startswith("data:image/") or src.startswith("data:video/"):
        return True
    if src.startswith("blob:"):
        return True
    parsed = urlparse(src)
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)
