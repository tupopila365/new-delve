from datetime import date
from decimal import Decimal

from .models import AccommodationBooking, AccommodationListing, BookingStatus

# Bookings in these statuses hold inventory for overlap checks.
BLOCKING_STATUSES = (
    BookingStatus.PENDING,
    BookingStatus.CONFIRMED,
    BookingStatus.CHECKED_IN,
)


def normalize_room_type_name(name: str | None) -> str:
    return (name or "").strip()


def dates_overlap(check_in_a: date, check_out_a: date, check_in_b: date, check_out_b: date) -> bool:
    """True when two stay ranges share at least one night (check-out day is exclusive)."""
    return check_in_a < check_out_b and check_out_a > check_in_b


def blocking_bookings_qs(
    listing: AccommodationListing,
    *,
    room_type_name: str = "",
    exclude_booking_id: int | None = None,
):
    qs = AccommodationBooking.objects.filter(
        listing=listing,
        status__in=BLOCKING_STATUSES,
        room_type_name=normalize_room_type_name(room_type_name),
    )
    if exclude_booking_id:
        qs = qs.exclude(pk=exclude_booking_id)
    return qs


def find_overlapping_booking(
    listing: AccommodationListing,
    check_in: date,
    check_out: date,
    *,
    room_type_name: str = "",
    exclude_booking_id: int | None = None,
) -> AccommodationBooking | None:
    for booking in blocking_bookings_qs(
        listing,
        room_type_name=room_type_name,
        exclude_booking_id=exclude_booking_id,
    ).only("id", "check_in", "check_out", "status", "room_type_name"):
        if dates_overlap(check_in, check_out, booking.check_in, booking.check_out):
            return booking
    return None


def stay_availability_unavailable_reason(
    listing: AccommodationListing,
    check_in: date,
    check_out: date,
    guests: int,
    *,
    room_type_name: str = "",
    exclude_booking_id: int | None = None,
) -> str | None:
    if check_out <= check_in:
        return "Check-out must be after check-in."
    if guests < 1:
        return "Select at least 1 guest."

    max_guests = listing.max_guests
    room_key = normalize_room_type_name(room_type_name)
    if room_key:
        found = False
        for row in listing.room_types or []:
            if not isinstance(row, dict):
                continue
            if str(row.get("name", "")).strip() != room_key:
                continue
            found = True
            mg = row.get("max_guests")
            if mg is not None:
                try:
                    max_guests = min(max_guests, int(mg))
                except (TypeError, ValueError):
                    pass
            break
        if not found:
            return "Unknown room type for this listing."
    if guests > max_guests:
        return f"This room fits up to {max_guests} guests."

    conflict = find_overlapping_booking(
        listing,
        check_in,
        check_out,
        room_type_name=room_key,
        exclude_booking_id=exclude_booking_id,
    )
    if conflict:
        label = room_key or "this stay"
        return f"{label.capitalize()} is already booked for part of those dates. Try different dates."
    return None


def estimate_stay_total(
    listing: AccommodationListing,
    check_in: date,
    check_out: date,
    *,
    room_type_name: str = "",
) -> tuple[int, Decimal]:
    nights = max(1, (check_out - check_in).days)
    nightly = listing.price_per_night
    room_key = normalize_room_type_name(room_type_name)
    if room_key:
        for row in listing.room_types or []:
            if not isinstance(row, dict):
                continue
            if str(row.get("name", "")).strip() != room_key:
                continue
            p = row.get("price_per_night")
            if p is not None and str(p).strip() != "":
                nightly = Decimal(str(p))
            break
    return nights, nightly * nights


def listing_availability_payload(
    listing: AccommodationListing,
    check_in: date | None,
    check_out: date | None,
    guests: int,
    *,
    room_type_name: str = "",
    exclude_booking_id: int | None = None,
) -> dict:
    blocked = (
        blocking_bookings_qs(listing, room_type_name=normalize_room_type_name(room_type_name))
        .order_by("check_in")
        .values("check_in", "check_out", "status", "room_type_name")[:24]
    )
    blocked_ranges = [
        {
            "check_in": row["check_in"].isoformat(),
            "check_out": row["check_out"].isoformat(),
            "status": row["status"],
            "room_type_name": row["room_type_name"] or "",
        }
        for row in blocked
    ]

    if not check_in or not check_out:
        return {
            "available": False,
            "reason": "Select check-in and check-out dates.",
            "blocked_ranges": blocked_ranges,
        }

    reason = stay_availability_unavailable_reason(
        listing,
        check_in,
        check_out,
        guests,
        room_type_name=room_type_name,
        exclude_booking_id=exclude_booking_id,
    )
    if reason:
        return {
            "available": False,
            "reason": reason,
            "blocked_ranges": blocked_ranges,
        }

    nights, total = estimate_stay_total(
        listing,
        check_in,
        check_out,
        room_type_name=room_type_name,
    )
    return {
        "available": True,
        "nights": nights,
        "estimated_total": str(total),
        "blocked_ranges": blocked_ranges,
    }
