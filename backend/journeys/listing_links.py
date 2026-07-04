"""Resolve optional journey stop links to marketplace listings."""

from __future__ import annotations

from accommodation.models import AccommodationListing
from events_app.models import Event
from food.models import FoodVenue

LINKED_LISTING_TYPES = frozenset({"accommodation", "food", "event"})


def linked_listing_href(listing_type: str, listing_id: int) -> str:
    if listing_type == "accommodation":
        return f"/accommodation/{listing_id}"
    if listing_type == "food":
        return f"/food/{listing_id}"
    if listing_type == "event":
        return f"/events/{listing_id}"
    return ""


def resolve_linked_listing(listing_type: str, listing_id: int | None) -> dict | None:
    lt = (listing_type or "").strip().lower()
    if not lt or not listing_id or lt not in LINKED_LISTING_TYPES:
        return None

    title = ""
    if lt == "accommodation":
        row = AccommodationListing.objects.filter(pk=listing_id, is_active=True).first()
        title = row.title if row else ""
    elif lt == "food":
        row = FoodVenue.objects.filter(pk=listing_id, is_active=True).first()
        title = row.name if row else ""
    elif lt == "event":
        row = Event.objects.filter(pk=listing_id, is_published=True).first()
        title = row.title if row else ""

    if not title:
        return None

    return {
        "kind": lt,
        "id": listing_id,
        "title": title,
        "href": linked_listing_href(lt, listing_id),
    }
