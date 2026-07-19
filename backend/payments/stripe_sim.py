"""Stripe PaymentIntent / webhook simulation for marketplace hold capture."""

from __future__ import annotations

import json
import re
import uuid
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from accounts.marketplace_payout import (
    mark_booking_payment_held,
    mark_booking_refunded_payout,
)
from payments.models import PaymentIntentStatus, PaymentTarget, SimulatedPaymentIntent
from shop.commerce_services import mark_payment_held, mark_refunded, release_seller_payout
from shop.models import Order, OrderStatus

# Stripe test-card style outcomes (digits only).
CARD_OUTCOMES = {
    "4242424242424242": ("succeeded", None, None),
    "4000000000000002": ("failed", "card_declined", "Your card was declined."),
    "4000000000009995": ("failed", "insufficient_funds", "Your card has insufficient funds."),
    "4000000000009987": ("failed", "expired_card", "Your card has expired."),
    "4000000000000069": ("failed", "expired_card", "Your card has expired."),
    "4000000000000127": ("failed", "incorrect_cvc", "Your card's security code is incorrect."),
}


def digits_only(card: str) -> str:
    return re.sub(r"\D", "", card or "")


def new_pi_id() -> str:
    return f"pi_sim_{uuid.uuid4().hex[:24]}"


def new_secret(pi_id: str) -> str:
    return f"{pi_id}_secret_{uuid.uuid4().hex[:16]}"


def new_charge_id() -> str:
    return f"ch_sim_{uuid.uuid4().hex[:24]}"


def serialize_intent(pi: SimulatedPaymentIntent, *, include_buyer: bool = False) -> dict:
    data = {
        "id": pi.stripe_id,
        "object": "payment_intent",
        "client_secret": pi.client_secret,
        "status": pi.status,
        "amount": str(pi.amount),
        "amount_cents": pi.amount_cents,
        "currency": pi.currency,
        "target_type": pi.target_type,
        "target_id": pi.target_id,
        "last4": pi.last4,
        "brand": pi.brand,
        "failure_code": pi.failure_code,
        "failure_message": pi.failure_message,
        "charge_id": pi.charge_id,
        "refunded": pi.refunded,
        "created_at": pi.created_at.isoformat() if pi.created_at else "",
        "confirmed_at": pi.confirmed_at.isoformat() if pi.confirmed_at else "",
        "metadata": pi.metadata or {},
        "simulated": True,
        "provider": "stripe_sim",
    }
    if include_buyer:
        data["buyer_username"] = getattr(pi.buyer, "username", "") or ""
        data["buyer_id"] = pi.buyer_id
    return data


def _resolve_amount_and_owner(*, buyer, target_type: str, target_id: str, metadata: dict):
    if target_type == PaymentTarget.SHOP_ORDER:
        order = Order.objects.select_related("buyer").filter(order_ref=target_id).first()
        if not order:
            raise ValueError("Order not found.")
        if order.buyer_id != buyer.pk:
            raise PermissionError("Not your order.")
        if order.mock_payment_ref or order.payout_status not in ("none", ""):
            if order.status != OrderStatus.PENDING and order.mock_payment_ref:
                raise ValueError("Order already paid.")
        return Decimal(order.total or 0), {"order_ref": order.order_ref}

    if target_type == PaymentTarget.ACCOMMODATION:
        from accommodation.models import AccommodationBooking

        b = AccommodationBooking.objects.filter(pk=int(target_id)).first()
        if not b or b.guest_id != buyer.pk:
            raise PermissionError("Booking not found.")
        if b.mock_payment_ref:
            raise ValueError("Booking already paid.")
        return Decimal(b.total_price or 0), {"booking_id": b.pk}

    if target_type == PaymentTarget.GUIDE:
        from guides.models import GuideBooking

        b = GuideBooking.objects.filter(pk=int(target_id)).first()
        if not b or b.client_id != buyer.pk:
            raise PermissionError("Booking not found.")
        if b.mock_payment_ref:
            raise ValueError("Booking already paid.")
        return Decimal(b.total_price or 0), {"booking_id": b.pk}

    if target_type == PaymentTarget.VEHICLE:
        from transport.models import VehicleRentalBooking

        b = VehicleRentalBooking.objects.filter(pk=int(target_id)).first()
        if not b or b.renter_id != buyer.pk:
            raise PermissionError("Booking not found.")
        if b.mock_payment_ref:
            raise ValueError("Booking already paid.")
        return Decimal(b.total_price or 0), {"booking_id": b.pk}

    if target_type == PaymentTarget.BUS_SEAT:
        from transport.models import SeatReservation

        b = SeatReservation.objects.select_related("trip").filter(pk=int(target_id)).first()
        if not b or b.passenger_id != buyer.pk:
            raise PermissionError("Reservation not found.")
        if b.mock_payment_ref:
            raise ValueError("Reservation already paid.")
        total = b.total_price if b.total_price else b.trip.price
        return Decimal(total or 0), {"reservation_id": b.pk}

    if target_type == PaymentTarget.BUS_SEAT_BULK:
        from transport.models import SeatReservation

        ids = metadata.get("reservation_ids") or []
        if isinstance(ids, str):
            ids = json.loads(ids)
        ids = [int(x) for x in ids]
        if not ids:
            raise ValueError("reservation_ids required for bulk bus payment.")
        rows = list(SeatReservation.objects.select_related("trip").filter(pk__in=ids, passenger=buyer))
        if len(rows) != len(ids):
            raise PermissionError("One or more seats not found.")
        if any(r.mock_payment_ref for r in rows):
            raise ValueError("Seats already paid.")
        total = sum((r.total_price or r.trip.price or Decimal("0")) for r in rows)
        return Decimal(total), {"reservation_ids": ids}

    raise ValueError("Unsupported target_type.")


def create_payment_intent(
    *,
    buyer,
    target_type: str,
    target_id: str,
    metadata: dict | None = None,
) -> SimulatedPaymentIntent:
    target_type = (target_type or "").strip()
    target_id = str(target_id or "").strip()
    meta = dict(metadata or {})
    if target_type not in PaymentTarget.values:
        raise ValueError("Invalid target_type.")

    amount, extra = _resolve_amount_and_owner(
        buyer=buyer, target_type=target_type, target_id=target_id, metadata=meta
    )
    if amount <= 0:
        raise ValueError("Amount must be greater than zero.")
    meta.update(extra)

    # Reuse open intent for same target
    existing = (
        SimulatedPaymentIntent.objects.filter(
            buyer=buyer,
            target_type=target_type,
            target_id=target_id,
            status__in=[
                PaymentIntentStatus.REQUIRES_PAYMENT_METHOD,
                PaymentIntentStatus.REQUIRES_CONFIRMATION,
                PaymentIntentStatus.PROCESSING,
            ],
        )
        .order_by("-created_at")
        .first()
    )
    if existing:
        existing.amount = amount
        existing.metadata = meta
        existing.save(update_fields=["amount", "metadata"])
        return existing

    stripe_id = new_pi_id()
    return SimulatedPaymentIntent.objects.create(
        stripe_id=stripe_id,
        client_secret=new_secret(stripe_id),
        status=PaymentIntentStatus.REQUIRES_PAYMENT_METHOD,
        amount=amount,
        currency="nad",
        target_type=target_type,
        target_id=target_id,
        buyer=buyer,
        metadata=meta,
    )


@transaction.atomic
def confirm_payment_intent(
    *,
    buyer,
    payment_intent_id: str,
    card_number: str,
    exp_month: str = "",
    exp_year: str = "",
    cvc: str = "",
) -> SimulatedPaymentIntent:
    pi = (
        SimulatedPaymentIntent.objects.select_for_update()
        .filter(stripe_id=payment_intent_id, buyer=buyer)
        .first()
    )
    if not pi:
        raise LookupError("PaymentIntent not found.")
    if pi.status == PaymentIntentStatus.SUCCEEDED:
        return pi
    if pi.status in (PaymentIntentStatus.CANCELED,):
        raise ValueError("PaymentIntent was canceled.")

    digits = digits_only(card_number)
    if len(digits) < 13:
        raise ValueError("Enter a valid card number.")

    outcome = CARD_OUTCOMES.get(digits)
    if outcome is None:
        # Unknown cards: succeed in sim (like many local test setups), but unknown brand.
        outcome = ("succeeded", None, None)

    result, fail_code, fail_msg = outcome
    pi.last4 = digits[-4:]
    pi.brand = "visa" if digits.startswith("4") else "card"
    pi.status = PaymentIntentStatus.PROCESSING
    pi.save(update_fields=["last4", "brand", "status"])

    # Simulate Stripe async webhook delivery immediately after confirm.
    event_type = "payment_intent.succeeded" if result == "succeeded" else "payment_intent.payment_failed"
    return apply_webhook_event(
        event_type=event_type,
        payment_intent_id=pi.stripe_id,
        failure_code=fail_code or "",
        failure_message=fail_msg or "",
    )


def apply_webhook_event(
    *,
    event_type: str,
    payment_intent_id: str,
    failure_code: str = "",
    failure_message: str = "",
) -> SimulatedPaymentIntent:
    """Mirror Stripe webhook consumers: succeeded → hold funds; failed → mark failed; refund → refunded."""
    pi = SimulatedPaymentIntent.objects.filter(stripe_id=payment_intent_id).first()
    if not pi:
        raise LookupError("PaymentIntent not found.")

    if event_type == "payment_intent.succeeded":
        if pi.status == PaymentIntentStatus.SUCCEEDED:
            return pi
        pi.status = PaymentIntentStatus.SUCCEEDED
        pi.failure_code = ""
        pi.failure_message = ""
        pi.charge_id = pi.charge_id or new_charge_id()
        pi.confirmed_at = timezone.now()
        pi.save(
            update_fields=[
                "status",
                "failure_code",
                "failure_message",
                "charge_id",
                "confirmed_at",
            ]
        )
        _fulfill_capture(pi)
        return pi

    if event_type == "payment_intent.payment_failed":
        pi.status = PaymentIntentStatus.FAILED
        pi.failure_code = failure_code or "card_declined"
        pi.failure_message = failure_message or "Your card was declined."
        pi.save(update_fields=["status", "failure_code", "failure_message"])
        return pi

    if event_type in ("charge.refunded", "payment_intent.canceled"):
        if event_type == "payment_intent.canceled" and pi.status != PaymentIntentStatus.SUCCEEDED:
            pi.status = PaymentIntentStatus.CANCELED
            pi.save(update_fields=["status"])
            return pi
        pi.refunded = True
        if pi.status != PaymentIntentStatus.SUCCEEDED:
            pi.status = PaymentIntentStatus.CANCELED
        pi.save(update_fields=["refunded", "status"])
        _fulfill_refund(pi)
        return pi

    raise ValueError(f"Unsupported event type: {event_type}")


def _fulfill_capture(pi: SimulatedPaymentIntent) -> None:
    ref = pi.stripe_id
    if pi.target_type == PaymentTarget.SHOP_ORDER:
        order = Order.objects.filter(order_ref=pi.target_id).first()
        if not order:
            return
        if order.mock_payment_ref:
            return
        order.status = OrderStatus.PAID
        order.mock_payment_ref = ref
        fields = ["status", "mock_payment_ref", "updated_at", *mark_payment_held(order)]
        order.save(update_fields=list(dict.fromkeys(fields)))
        return

    if pi.target_type == PaymentTarget.ACCOMMODATION:
        from accommodation.models import AccommodationBooking

        b = AccommodationBooking.objects.filter(pk=int(pi.target_id)).first()
        if b and not b.mock_payment_ref:
            b.mock_payment_ref = ref
            fields = ["mock_payment_ref", *mark_booking_payment_held(b)]
            b.save(update_fields=list(dict.fromkeys(fields)))
        return

    if pi.target_type == PaymentTarget.GUIDE:
        from guides.models import GuideBooking

        b = GuideBooking.objects.filter(pk=int(pi.target_id)).first()
        if b and not b.mock_payment_ref:
            b.mock_payment_ref = ref
            b.status = "confirmed"
            fields = ["mock_payment_ref", "status", *mark_booking_payment_held(b)]
            b.save(update_fields=list(dict.fromkeys(fields)))
        return

    if pi.target_type == PaymentTarget.VEHICLE:
        from transport.models import VehicleRentalBooking

        b = VehicleRentalBooking.objects.filter(pk=int(pi.target_id)).first()
        if b and not b.mock_payment_ref:
            b.mock_payment_ref = ref
            fields = ["mock_payment_ref", *mark_booking_payment_held(b)]
            b.save(update_fields=list(dict.fromkeys(fields)))
        return

    if pi.target_type == PaymentTarget.BUS_SEAT:
        from transport.models import SeatReservation

        b = SeatReservation.objects.filter(pk=int(pi.target_id)).first()
        if b and not b.mock_payment_ref:
            if not b.total_price:
                b.total_price = b.trip.price
            b.mock_payment_ref = ref
            fields = ["mock_payment_ref", "total_price", *mark_booking_payment_held(b)]
            b.save(update_fields=list(dict.fromkeys(fields)))
        return

    if pi.target_type == PaymentTarget.BUS_SEAT_BULK:
        from transport.models import SeatReservation

        ids = pi.metadata.get("reservation_ids") or []
        for rid in ids:
            b = SeatReservation.objects.filter(pk=int(rid)).first()
            if not b or b.mock_payment_ref:
                continue
            if not b.total_price:
                b.total_price = b.trip.price
            b.mock_payment_ref = ref
            fields = ["mock_payment_ref", "total_price", *mark_booking_payment_held(b)]
            b.save(update_fields=list(dict.fromkeys(fields)))


def _fulfill_refund(pi: SimulatedPaymentIntent) -> None:
    if pi.target_type == PaymentTarget.SHOP_ORDER:
        order = Order.objects.filter(order_ref=pi.target_id).first()
        if order:
            fields = mark_refunded(order)
            order.save(update_fields=list(dict.fromkeys(fields)))
        return

    obj = None
    if pi.target_type == PaymentTarget.ACCOMMODATION:
        from accommodation.models import AccommodationBooking

        obj = AccommodationBooking.objects.filter(pk=int(pi.target_id)).first()
    elif pi.target_type == PaymentTarget.GUIDE:
        from guides.models import GuideBooking

        obj = GuideBooking.objects.filter(pk=int(pi.target_id)).first()
    elif pi.target_type == PaymentTarget.VEHICLE:
        from transport.models import VehicleRentalBooking

        obj = VehicleRentalBooking.objects.filter(pk=int(pi.target_id)).first()
    elif pi.target_type == PaymentTarget.BUS_SEAT:
        from transport.models import SeatReservation

        obj = SeatReservation.objects.filter(pk=int(pi.target_id)).first()
    elif pi.target_type == PaymentTarget.BUS_SEAT_BULK:
        from transport.models import SeatReservation

        for rid in pi.metadata.get("reservation_ids") or []:
            b = SeatReservation.objects.filter(pk=int(rid)).first()
            if b:
                fields = mark_booking_refunded_payout(b)
                if hasattr(b, "status"):
                    b.status = "refunded"
                    fields = list(fields) + ["status"]
                if fields:
                    b.save(update_fields=list(dict.fromkeys(fields)))
        return

    if obj:
        fields = mark_booking_refunded_payout(obj)
        if hasattr(obj, "status"):
            obj.status = "refunded"
            fields = list(fields) + ["status"]
        if fields:
            obj.save(update_fields=list(dict.fromkeys(fields)))
