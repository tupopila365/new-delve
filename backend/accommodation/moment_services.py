from __future__ import annotations

from django.utils import timezone

from .models import AccommodationBooking, AccommodationListing, BookingStatus


INELIGIBLE_MOMENT_REASON = "Complete a stay before sharing a Delvers Moment."


def latest_completed_stay_booking(user, listing: AccommodationListing):
    """Return the latest checked-out booking proving a traveller stayed here."""
    if not user or not getattr(user, "is_authenticated", False):
        return None
    return (
        AccommodationBooking.objects.filter(
            guest=user,
            listing=listing,
            status=BookingStatus.CHECKED_OUT,
            check_out__lte=timezone.localdate(),
        )
        .order_by("-check_out", "-created_at", "-pk")
        .first()
    )


def stay_moment_eligibility(user, listing: AccommodationListing) -> dict:
    booking = latest_completed_stay_booking(user, listing)
    if booking is None:
        return {"eligible": False, "reason": INELIGIBLE_MOMENT_REASON}
    return {
        "eligible": True,
        "reason": "Verified stay — your Moment will show a completed-stay badge.",
        "completed_on": booking.check_out.isoformat(),
    }
