"""Marketplace disputes — buyer opens, staff reviews (Phase 3)."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from accounts.marketplace_payout import PayoutStatus, mark_booking_refunded_payout, release_booking_payout
from accounts.models import MarketplaceDispute
from accounts.platform_audit import log_admin_action
from accommodation.models import AccommodationBooking
from guides.models import GuideBooking
from shop.commerce_services import mark_refunded, release_seller_payout
from shop.models import Order, OrderStatus
from transport.models import SeatReservation, VehicleRentalBooking

ACTIVE_STATUSES = (MarketplaceDispute.Status.OPEN, MarketplaceDispute.Status.UNDER_REVIEW)


def _title_for(source: str, record_id: int) -> str:
    if source == MarketplaceDispute.Source.SHOP:
        order = Order.objects.filter(pk=record_id).first()
        return f"Order {order.order_ref}" if order else f"Order #{record_id}"
    if source == MarketplaceDispute.Source.ACCOMMODATION:
        b = AccommodationBooking.objects.select_related("listing").filter(pk=record_id).first()
        return b.listing.title if b else f"Stay #{record_id}"
    if source == MarketplaceDispute.Source.GUIDE:
        b = GuideBooking.objects.select_related("guide").filter(pk=record_id).first()
        return b.guide.headline if b else f"Guide #{record_id}"
    if source == MarketplaceDispute.Source.VEHICLE:
        b = VehicleRentalBooking.objects.select_related("listing").filter(pk=record_id).first()
        return b.listing.title if b else f"Vehicle #{record_id}"
    if source == MarketplaceDispute.Source.BUS_SEAT:
        b = SeatReservation.objects.select_related("trip__route").filter(pk=record_id).first()
        if not b:
            return f"Bus seat #{record_id}"
        route = b.trip.route
        return f"{route.origin} → {route.destination} · seat {b.seat_number}"
    return f"{source}:{record_id}"


def serialize_dispute(d: MarketplaceDispute, *, include_body: bool = True) -> dict:
    row = {
        "id": d.pk,
        "source": d.source,
        "source_label": d.get_source_display(),
        "record_id": d.record_id,
        "title": _title_for(d.source, d.record_id),
        "buyer_username": d.opener.username,
        "seller_username": d.seller.username,
        "reason": d.reason,
        "reason_label": d.get_reason_display(),
        "status": d.status,
        "status_label": d.get_status_display(),
        "resolution": d.resolution or "",
        "resolution_label": d.get_resolution_display() if d.resolution else "",
        "created_at": d.created_at.isoformat() if d.created_at else "",
        "updated_at": d.updated_at.isoformat() if d.updated_at else "",
        "resolved_at": d.resolved_at.isoformat() if d.resolved_at else "",
    }
    if include_body:
        row["body"] = d.body
        row["resolution_note"] = d.resolution_note or ""
        row["resolved_by_username"] = d.resolved_by.username if d.resolved_by_id else ""
    return row


def get_open_dispute(source: str, record_id: int) -> MarketplaceDispute | None:
    return (
        MarketplaceDispute.objects.filter(source=source, record_id=record_id, status__in=ACTIVE_STATUSES)
        .select_related("opener", "seller")
        .first()
    )


def _subject(source: str, record_id: int):
    """Return (buyer, seller, payout_status, obj) or raise ValueError."""
    if source == MarketplaceDispute.Source.SHOP:
        order = Order.objects.select_related("buyer", "seller").filter(pk=record_id).first()
        if not order:
            raise ValueError("Order not found.")
        return order.buyer, order.seller, order.payout_status, order

    if source == MarketplaceDispute.Source.ACCOMMODATION:
        b = AccommodationBooking.objects.select_related("guest", "listing__owner").filter(pk=record_id).first()
        if not b:
            raise ValueError("Booking not found.")
        return b.guest, b.listing.owner, b.payout_status, b

    if source == MarketplaceDispute.Source.GUIDE:
        b = GuideBooking.objects.select_related("client", "guide__user").filter(pk=record_id).first()
        if not b:
            raise ValueError("Booking not found.")
        return b.client, b.guide.user, b.payout_status, b

    if source == MarketplaceDispute.Source.VEHICLE:
        b = VehicleRentalBooking.objects.select_related("renter", "listing__owner").filter(pk=record_id).first()
        if not b:
            raise ValueError("Booking not found.")
        return b.renter, b.listing.owner, b.payout_status, b

    if source == MarketplaceDispute.Source.BUS_SEAT:
        b = (
            SeatReservation.objects.select_related(
                "passenger", "trip__route__operator__owner"
            )
            .filter(pk=record_id)
            .first()
        )
        if not b:
            raise ValueError("Reservation not found.")
        return b.passenger, b.trip.route.operator.owner, b.payout_status, b

    raise ValueError("Unsupported source.")


def open_dispute(
    *,
    user,
    source: str,
    record_id: int,
    reason: str,
    body: str,
) -> MarketplaceDispute:
    source = (source or "").strip().lower()
    reason = (reason or MarketplaceDispute.Reason.OTHER).strip().lower()
    body = (body or "").strip()
    if source not in MarketplaceDispute.Source.values:
        raise ValueError("Invalid source.")
    if reason not in MarketplaceDispute.Reason.values:
        raise ValueError("Invalid reason.")
    if len(body) < 10:
        raise ValueError("Please describe the issue (at least 10 characters).")

    buyer, seller, payout_status, obj = _subject(source, int(record_id))
    if buyer.pk != user.pk:
        raise PermissionError("Only the buyer can open a dispute on this purchase.")

    if get_open_dispute(source, int(record_id)):
        raise ValueError("An open dispute already exists for this purchase.")

    # Eligible when money was held (paid) and not already refunded.
    if source == MarketplaceDispute.Source.SHOP:
        if obj.status in (OrderStatus.PENDING, OrderStatus.CANCELLED, OrderStatus.REFUNDED):
            raise ValueError("This order cannot be disputed in its current status.")
    else:
        if payout_status in (PayoutStatus.NONE, PayoutStatus.REFUNDED):
            raise ValueError("You can dispute after payment is held by Delve.")

    dispute = MarketplaceDispute.objects.create(
        source=source,
        record_id=int(record_id),
        opener=buyer,
        seller=seller,
        reason=reason,
        body=body,
        status=MarketplaceDispute.Status.OPEN,
    )
    return dispute


def list_disputes_for_admin(*, status: str = "", source: str = "", search: str = "", limit: int = 200) -> list[dict]:
    qs = MarketplaceDispute.objects.select_related("opener", "seller", "resolved_by").all()
    st = (status or "").strip().lower()
    if st == "active" or not st:
        qs = qs.filter(status__in=ACTIVE_STATUSES)
    elif st != "all":
        qs = qs.filter(status=st)
    src = (source or "").strip().lower()
    if src:
        qs = qs.filter(source=src)
    q = (search or "").strip().lower()
    rows = []
    for d in qs[:300]:
        row = serialize_dispute(d, include_body=False)
        if q and not any(
            q in (v or "").lower()
            for v in (row["title"], row["buyer_username"], row["seller_username"], row["reason_label"])
        ):
            continue
        rows.append(row)
        if len(rows) >= limit:
            break
    return rows


def list_disputes_for_user(user) -> list[dict]:
    qs = (
        MarketplaceDispute.objects.filter(opener=user)
        .select_related("opener", "seller", "resolved_by")
        .order_by("-created_at")[:100]
    )
    return [serialize_dispute(d) for d in qs]


@transaction.atomic
def resolve_dispute(
    *,
    dispute: MarketplaceDispute,
    actor,
    status: str,
    resolution: str = "",
    resolution_note: str = "",
    apply_money: bool = True,
) -> MarketplaceDispute:
    status = (status or "").strip().lower()
    resolution = (resolution or "").strip().lower()
    resolution_note = (resolution_note or "").strip()

    if status not in (
        MarketplaceDispute.Status.UNDER_REVIEW,
        MarketplaceDispute.Status.RESOLVED,
        MarketplaceDispute.Status.CLOSED,
        MarketplaceDispute.Status.OPEN,
    ):
        raise ValueError("Invalid status.")

    dispute.status = status
    if resolution:
        if resolution not in dict(MarketplaceDispute.Resolution.choices):
            raise ValueError("Invalid resolution.")
        dispute.resolution = resolution
    if resolution_note:
        dispute.resolution_note = resolution_note

    if status in (MarketplaceDispute.Status.RESOLVED, MarketplaceDispute.Status.CLOSED):
        dispute.resolved_by = actor
        dispute.resolved_at = timezone.now()

        if apply_money and resolution == MarketplaceDispute.Resolution.REFUND_BUYER:
            _apply_refund(dispute.source, dispute.record_id)
        elif apply_money and resolution == MarketplaceDispute.Resolution.RELEASE_SELLER:
            _apply_release(dispute.source, dispute.record_id)

    dispute.save()
    log_admin_action(
        actor=actor,
        action="dispute_resolve",
        target_type="dispute",
        target_id=str(dispute.pk),
        detail=f"{dispute.source}:{dispute.record_id} → {status}/{resolution or '-'}",
    )
    return dispute


def _apply_refund(source: str, record_id: int) -> None:
    if source == MarketplaceDispute.Source.SHOP:
        order = Order.objects.filter(pk=record_id).first()
        if order and order.status != OrderStatus.REFUNDED:
            fields = mark_refunded(order)
            order.save(update_fields=list(dict.fromkeys(fields)))
        return

    obj = None
    if source == MarketplaceDispute.Source.ACCOMMODATION:
        obj = AccommodationBooking.objects.filter(pk=record_id).first()
    elif source == MarketplaceDispute.Source.GUIDE:
        obj = GuideBooking.objects.filter(pk=record_id).first()
    elif source == MarketplaceDispute.Source.VEHICLE:
        obj = VehicleRentalBooking.objects.filter(pk=record_id).first()
    elif source == MarketplaceDispute.Source.BUS_SEAT:
        obj = SeatReservation.objects.filter(pk=record_id).first()
    if obj:
        fields = mark_booking_refunded_payout(obj)
        if hasattr(obj, "status"):
            obj.status = "refunded"
            fields = list(fields) + ["status"]
        if fields:
            obj.save(update_fields=list(dict.fromkeys(fields)))


def _apply_release(source: str, record_id: int) -> None:
    if source == MarketplaceDispute.Source.SHOP:
        order = Order.objects.filter(pk=record_id).first()
        if order and order.payout_status == PayoutStatus.HELD:
            fields = release_seller_payout(order)
            order.save(update_fields=list(dict.fromkeys(fields + ["updated_at"])))
        return

    obj = None
    if source == MarketplaceDispute.Source.ACCOMMODATION:
        obj = AccommodationBooking.objects.filter(pk=record_id).first()
    elif source == MarketplaceDispute.Source.GUIDE:
        obj = GuideBooking.objects.filter(pk=record_id).first()
    elif source == MarketplaceDispute.Source.VEHICLE:
        obj = VehicleRentalBooking.objects.filter(pk=record_id).first()
    elif source == MarketplaceDispute.Source.BUS_SEAT:
        obj = SeatReservation.objects.filter(pk=record_id).first()
    if obj:
        fields = release_booking_payout(obj)
        if fields:
            obj.save(update_fields=list(dict.fromkeys(fields)))
