"""Shared marketplace payout hold/release for bookings and shop orders."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable

from django.conf import settings
from django.db import models
from django.utils import timezone

TWO = Decimal("0.01")


class PayoutStatus(models.TextChoices):
    NONE = "none", "Not paid yet"
    HELD = "held", "Held by Delve"
    RELEASED = "released", "Released to seller"
    REFUNDED = "refunded", "Refunded to buyer"


def _clamp_percent(raw, default: str = "10") -> Decimal:
    try:
        value = Decimal(str(raw))
    except Exception:
        value = Decimal(default)
    return max(Decimal("0"), min(value, Decimal("100")))


def booking_fee_percent() -> Decimal:
    """Service-provider bookings (stays, guides, transport): default 10%."""
    return _clamp_percent(getattr(settings, "BOOKING_PLATFORM_FEE_PERCENT", "10"), "10")


def shop_fee_percent() -> Decimal:
    """Shop item fee: default 2.5% of items (shipping stays with seller)."""
    return _clamp_percent(getattr(settings, "SHOP_PLATFORM_FEE_PERCENT", "2.5"), "2.5")


def compute_fee(amount: Decimal, percent: Decimal) -> Decimal:
    base = amount or Decimal("0")
    return (base * percent / Decimal("100")).quantize(TWO, rounding=ROUND_HALF_UP)


def apply_booking_marketplace_totals(booking, *, total_field: str = "total_price") -> None:
    """Set platform_fee + seller_payout from booking total."""
    total = getattr(booking, total_field, None) or Decimal("0")
    fee = compute_fee(Decimal(total), booking_fee_percent())
    booking.platform_fee = fee
    booking.seller_payout = max(Decimal("0"), Decimal(total) - fee)


def mark_booking_payment_held(booking, *, total_field: str = "total_price") -> list[str]:
    apply_booking_marketplace_totals(booking, total_field=total_field)
    booking.payout_status = PayoutStatus.HELD
    booking.paid_at = timezone.now()
    return ["platform_fee", "seller_payout", "payout_status", "paid_at"]


def release_booking_payout(booking) -> list[str]:
    if getattr(booking, "payout_status", None) != PayoutStatus.HELD:
        return []
    from accounts.seller_trust import resolve_booking_seller, seller_may_receive_payout

    seller = resolve_booking_seller(booking)
    if seller is not None and not seller_may_receive_payout(seller):
        # Trust gate: keep held for unverified / new sellers.
        return []
    booking.payout_status = PayoutStatus.RELEASED
    booking.payout_released_at = timezone.now()
    return ["payout_status", "payout_released_at"]


def mark_booking_refunded_payout(booking) -> list[str]:
    booking.payout_status = PayoutStatus.REFUNDED
    return ["payout_status"]


def save_booking_fields(booking, fields: Iterable[str]) -> None:
    """Persist unique field names plus updated_at when present."""
    update = list(dict.fromkeys(fields))
    if hasattr(booking, "updated_at") and "updated_at" not in update:
        # Many booking models only have created_at — skip if missing.
        pass
    if update:
        booking.save(update_fields=update)
