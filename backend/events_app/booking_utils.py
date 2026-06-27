import secrets

from django.utils import timezone

from .models import EventBooking, EventBookingStatus


def generate_check_in_token() -> str:
    return secrets.token_hex(8)


def ensure_check_in_token(booking: EventBooking) -> None:
    if booking.status in (EventBookingStatus.CONFIRMED, EventBookingStatus.CHECKED_IN) and not booking.check_in_token:
        booking.check_in_token = generate_check_in_token()
        booking.save(update_fields=["check_in_token"])


def apply_booking_status(booking: EventBooking, target_status: str) -> None:
    booking.status = target_status
    update_fields = ["status"]
    if target_status == EventBookingStatus.CONFIRMED and not booking.check_in_token:
        booking.check_in_token = generate_check_in_token()
        update_fields.append("check_in_token")
    if target_status == EventBookingStatus.CHECKED_IN:
        booking.checked_in_at = timezone.now()
        update_fields.append("checked_in_at")
        if not booking.check_in_token:
            booking.check_in_token = generate_check_in_token()
            update_fields.append("check_in_token")
    booking.save(update_fields=update_fields)
