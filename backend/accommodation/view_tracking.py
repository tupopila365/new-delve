"""Record stay listing / room page views for provider analytics."""

from __future__ import annotations

from django.db.models import F

from .models import AccommodationListing, AccommodationPageView


def record_accommodation_page_view(
    *,
    listing: AccommodationListing,
    viewer=None,
    room_name: str = "",
) -> bool:
    """
    Persist a page view. Returns False when skipped (owner self-view).
    Listing-page views also bump AccommodationListing.views_count.
    """
    room = (room_name or "").strip()[:120]
    viewer_id = getattr(viewer, "pk", None) if viewer is not None else None
    if viewer_id and viewer_id == listing.owner_id:
        return False

    AccommodationPageView.objects.create(
        listing=listing,
        room_name=room,
        viewer_id=viewer_id,
    )
    if not room:
        AccommodationListing.objects.filter(pk=listing.pk).update(views_count=F("views_count") + 1)
    return True
