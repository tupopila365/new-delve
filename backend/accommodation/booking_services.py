from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from .models import (
    AccommodationAvailability,
    AccommodationBooking,
    AccommodationListing,
    AccommodationRoomType,
    BookingStatus,
)

DEFAULT_HOST_APPROVAL_HOLD_HOURS = 24
DEFAULT_PAYMENT_HOLD_MINUTES = 30


def host_approval_hold_deadline(*, now=None):
    hours = max(
        1,
        int(
            getattr(
                settings,
                "ACCOMMODATION_HOST_APPROVAL_HOLD_HOURS",
                DEFAULT_HOST_APPROVAL_HOLD_HOURS,
            )
        ),
    )
    return (now or timezone.now()) + timedelta(hours=hours)


def payment_hold_deadline(*, now=None):
    minutes = max(
        1,
        int(
            getattr(
                settings,
                "ACCOMMODATION_PAYMENT_HOLD_MINUTES",
                DEFAULT_PAYMENT_HOLD_MINUTES,
            )
        ),
    )
    return (now or timezone.now()) + timedelta(minutes=minutes)


def booking_hold_is_expired(booking: AccommodationBooking, *, now=None) -> bool:
    if booking.status not in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
        return False
    if booking.paid_at is not None or booking.mock_payment_ref:
        return False
    return bool(booking.hold_expires_at and booking.hold_expires_at <= (now or timezone.now()))


def expire_stale_booking_holds(*, queryset=None, now=None) -> int:
    """Mark stale unpaid holds expired; expired rows no longer consume inventory."""
    moment = now or timezone.now()
    qs = queryset if queryset is not None else AccommodationBooking.objects.all()
    return qs.filter(
        status__in=(BookingStatus.PENDING, BookingStatus.CONFIRMED),
        hold_expires_at__isnull=False,
        hold_expires_at__lte=moment,
        paid_at__isnull=True,
        mock_payment_ref="",
    ).update(
        status=BookingStatus.EXPIRED,
        expired_at=moment,
    )


def normalize_room_type_name(name: str | None) -> str:
    """Legacy helper kept while older clients migrate to stable room IDs."""
    return (name or "").strip()


def dates_overlap(check_in_a: date, check_out_a: date, check_in_b: date, check_out_b: date) -> bool:
    """True when two stay ranges share at least one night (check-out day is exclusive)."""
    return check_in_a < check_out_b and check_out_a > check_in_b


def resolve_room_type(
    listing: AccommodationListing,
    *,
    room_type_id: int | str | None = None,
    room_type_name: str = "",
    active_only: bool = True,
) -> AccommodationRoomType | None:
    qs = listing.room_type_records.all()
    if active_only:
        qs = qs.filter(is_active=True)
    if room_type_id not in (None, ""):
        try:
            return qs.filter(pk=int(room_type_id)).first()
        except (TypeError, ValueError):
            return None
    name = normalize_room_type_name(room_type_name)
    if not name:
        return None
    matches = list(qs.filter(name=name).order_by("id")[:2])
    return matches[0] if len(matches) == 1 else None


def blocking_bookings_qs(
    listing: AccommodationListing,
    *,
    room_type: AccommodationRoomType | None = None,
    room_type_id: int | None = None,
    room_type_name: str = "",
    exclude_booking_id: int | None = None,
):
    if room_type is None:
        room_type = resolve_room_type(
            listing,
            room_type_id=room_type_id,
            room_type_name=room_type_name,
            active_only=False,
        )
    qs = AccommodationBooking.objects.filter(
        listing=listing,
    ).filter(
        Q(status=BookingStatus.CHECKED_IN)
        | (
            Q(status__in=(BookingStatus.PENDING, BookingStatus.CONFIRMED))
            & (
                Q(hold_expires_at__isnull=True)
                | Q(hold_expires_at__gt=timezone.now())
                | Q(paid_at__isnull=False)
                | ~Q(mock_payment_ref="")
            )
        )
    )
    if room_type is not None:
        qs = qs.filter(room_type=room_type)
    elif normalize_room_type_name(room_type_name):
        # Legacy bookings created before stable room IDs were introduced.
        qs = qs.filter(
            room_type__isnull=True,
            room_type_name=normalize_room_type_name(room_type_name),
        )
    else:
        qs = qs.filter(room_type__isnull=True, room_type_name="")
    if exclude_booking_id:
        qs = qs.exclude(pk=exclude_booking_id)
    return qs


def _night_dates(check_in: date, check_out: date):
    current = check_in
    while current < check_out:
        yield current
        current += timedelta(days=1)


def _calendar_by_date(
    listing: AccommodationListing,
    room_type: AccommodationRoomType | None,
    check_in: date,
    check_out: date,
) -> tuple[dict[date, AccommodationAvailability], dict[date, AccommodationAvailability]]:
    rows = AccommodationAvailability.objects.filter(
        listing=listing,
        date__gte=check_in,
        date__lt=check_out,
    ).filter(models_q_for_room(room_type))
    property_rows: dict[date, AccommodationAvailability] = {}
    room_rows: dict[date, AccommodationAvailability] = {}
    for row in rows:
        if row.room_type_id is None:
            property_rows[row.date] = row
        elif room_type and row.room_type_id == room_type.id:
            room_rows[row.date] = row
    return property_rows, room_rows


def models_q_for_room(room_type: AccommodationRoomType | None):
    from django.db.models import Q

    if room_type is None:
        return Q(room_type__isnull=True)
    return Q(room_type__isnull=True) | Q(room_type=room_type)


def _overlapping_bookings(
    listing: AccommodationListing,
    check_in: date,
    check_out: date,
    room_type: AccommodationRoomType | None,
    *,
    exclude_booking_id: int | None = None,
):
    return list(
        blocking_bookings_qs(
            listing,
            room_type=room_type,
            room_type_name=room_type.name if room_type else "",
            exclude_booking_id=exclude_booking_id,
        )
        .filter(check_in__lt=check_out, check_out__gt=check_in)
        .only("id", "check_in", "check_out", "status", "room_type_id", "room_type_name")
    )


def _inventory_conflict(
    listing: AccommodationListing,
    check_in: date,
    check_out: date,
    room_type: AccommodationRoomType | None,
    *,
    exclude_booking_id: int | None = None,
) -> AccommodationBooking | None:
    bookings = _overlapping_bookings(
        listing,
        check_in,
        check_out,
        room_type,
        exclude_booking_id=exclude_booking_id,
    )
    property_rows, room_rows = _calendar_by_date(listing, room_type, check_in, check_out)
    base_quantity = room_type.quantity_available if room_type else 1

    for night in _night_dates(check_in, check_out):
        property_override = property_rows.get(night)
        if property_override and not property_override.is_available:
            return bookings[0] if bookings else AccommodationBooking(listing=listing)
        room_override = room_rows.get(night)
        if room_override and not room_override.is_available:
            return bookings[0] if bookings else AccommodationBooking(listing=listing)
        quantity = base_quantity
        if room_override and room_override.quantity_available is not None:
            quantity = room_override.quantity_available
        elif property_override and property_override.quantity_available is not None and room_type is None:
            quantity = property_override.quantity_available
        occupying = [
            booking
            for booking in bookings
            if booking.check_in <= night < booking.check_out
        ]
        if len(occupying) >= quantity:
            return occupying[0] if occupying else AccommodationBooking(listing=listing)
    return None


def find_overlapping_booking(
    listing: AccommodationListing,
    check_in: date,
    check_out: date,
    *,
    room_type: AccommodationRoomType | None = None,
    room_type_id: int | None = None,
    room_type_name: str = "",
    exclude_booking_id: int | None = None,
) -> AccommodationBooking | None:
    room = room_type or resolve_room_type(
        listing,
        room_type_id=room_type_id,
        room_type_name=room_type_name,
    )
    return _inventory_conflict(
        listing,
        check_in,
        check_out,
        room,
        exclude_booking_id=exclude_booking_id,
    )


def stay_availability_unavailable_reason(
    listing: AccommodationListing,
    check_in: date,
    check_out: date,
    guests: int,
    *,
    room_type: AccommodationRoomType | None = None,
    room_type_id: int | None = None,
    room_type_name: str = "",
    exclude_booking_id: int | None = None,
) -> str | None:
    if check_out <= check_in:
        return "Check-out must be after check-in."
    if guests < 1:
        return "Select at least 1 guest."

    room = room_type or resolve_room_type(
        listing,
        room_type_id=room_type_id,
        room_type_name=room_type_name,
    )
    has_rooms = listing.room_type_records.filter(is_active=True).exists()
    if (room_type_id or normalize_room_type_name(room_type_name)) and room is None:
        return "Unknown room type for this property."
    if has_rooms and room is None:
        return "Select a room type."

    max_guests = min(listing.max_guests, room.max_guests) if room else listing.max_guests
    if guests > max_guests:
        return f"This room fits up to {max_guests} guests."

    conflict = _inventory_conflict(
        listing,
        check_in,
        check_out,
        room,
        exclude_booking_id=exclude_booking_id,
    )
    if conflict:
        label = room.name if room else "This stay"
        return f"{label} is sold out or closed for part of those dates. Try different dates."
    return None


def estimate_stay_total(
    listing: AccommodationListing,
    check_in: date,
    check_out: date,
    *,
    room_type: AccommodationRoomType | None = None,
    room_type_id: int | None = None,
    room_type_name: str = "",
) -> tuple[int, Decimal]:
    nightly_prices = nightly_price_breakdown(
        listing,
        check_in,
        check_out,
        room_type=room_type,
        room_type_id=room_type_id,
        room_type_name=room_type_name,
    )
    return max(1, (check_out - check_in).days), sum(
        (Decimal(row["price"]) for row in nightly_prices),
        Decimal("0"),
    )


def nightly_price_breakdown(
    listing: AccommodationListing,
    check_in: date,
    check_out: date,
    *,
    room_type: AccommodationRoomType | None = None,
    room_type_id: int | None = None,
    room_type_name: str = "",
) -> list[dict[str, str]]:
    """Return the exact nightly prices used to calculate a new booking."""
    nights = max(1, (check_out - check_in).days)
    room = room_type or resolve_room_type(
        listing,
        room_type_id=room_type_id,
        room_type_name=room_type_name,
    )
    base_rate = room.price_per_night if room else listing.price_per_night
    property_rows, room_rows = _calendar_by_date(listing, room, check_in, check_out)
    prices: list[dict[str, str]] = []
    for night in _night_dates(check_in, check_out):
        room_override = room_rows.get(night)
        property_override = property_rows.get(night)
        rate = (
            room_override.price_override
            if room_override and room_override.price_override is not None
            else property_override.price_override
            if property_override and property_override.price_override is not None
            else base_rate
        )
        prices.append({"date": night.isoformat(), "price": f"{rate:.2f}"})
    if not prices and nights == 1:
        prices.append({"date": check_in.isoformat(), "price": f"{base_rate:.2f}"})
    return prices


def listing_availability_payload(
    listing: AccommodationListing,
    check_in: date | None,
    check_out: date | None,
    guests: int,
    *,
    room_type_id: int | None = None,
    room_type_name: str = "",
    exclude_booking_id: int | None = None,
) -> dict:
    room = resolve_room_type(
        listing,
        room_type_id=room_type_id,
        room_type_name=room_type_name,
    )
    blocked_qs = blocking_bookings_qs(
        listing,
        room_type=room,
        room_type_name=room_type_name,
    ).order_by("check_in")[:24]
    blocked_ranges = [
        {
            "check_in": row.check_in.isoformat(),
            "check_out": row.check_out.isoformat(),
            "status": row.status,
            "room_type": row.room_type_id,
            "room_type_name": row.room_type_name or "",
        }
        for row in blocked_qs
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
        room_type=room,
        room_type_id=room_type_id,
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
        room_type=room,
        room_type_id=room_type_id,
        room_type_name=room_type_name,
    )
    return {
        "available": True,
        "nights": nights,
        "estimated_total": str(total),
        "room_type": room.id if room else None,
        "quantity_available": room.quantity_available if room else 1,
        "blocked_ranges": blocked_ranges,
    }
