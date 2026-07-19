"""Cross-vertical payments / payout queue for platform admin (Phase 2)."""

from __future__ import annotations

from accounts.marketplace_payout import PayoutStatus
from accommodation.models import AccommodationBooking
from guides.models import GuideBooking
from shop.models import Order
from transport.models import SeatReservation, VehicleRentalBooking

PAYMENT_SOURCES = ("shop", "accommodation", "guide", "vehicle", "bus_seat")

SOURCE_LABELS = {
    "shop": "Shop order",
    "accommodation": "Stay",
    "guide": "Guide",
    "vehicle": "Vehicle rental",
    "bus_seat": "Bus seat",
}


def _money(value) -> str:
    if value is None:
        return "0.00"
    return f"{value:.2f}" if hasattr(value, "__float__") else str(value)


def _iso(dt) -> str:
    return dt.isoformat() if dt else ""


def _payout_label(status: str) -> str:
    try:
        return PayoutStatus(status).label
    except ValueError:
        return status or "none"


def _payment_row(
    *,
    source: str,
    record_id: int,
    buyer_username: str,
    seller_username: str,
    title: str,
    status: str,
    total: str,
    platform_fee: str = "0.00",
    seller_payout: str = "0.00",
    payout_status: str = PayoutStatus.NONE,
    paid_at=None,
    payout_released_at=None,
    mock_payment_ref: str = "",
    created_at=None,
    fulfillment_label: str = "",
) -> dict:
    return {
        "id": f"{source}:{record_id}",
        "source": source,
        "source_label": SOURCE_LABELS.get(source, source),
        "record_id": record_id,
        "buyer_username": buyer_username,
        "seller_username": seller_username,
        "title": title,
        "status": status,
        "total": total,
        "platform_fee": platform_fee,
        "seller_payout": seller_payout,
        "payout_status": payout_status or PayoutStatus.NONE,
        "payout_status_label": _payout_label(payout_status or PayoutStatus.NONE),
        "paid_at": _iso(paid_at),
        "payout_released_at": _iso(payout_released_at),
        "mock_payment_ref": mock_payment_ref or "",
        "created_at": _iso(created_at),
        "fulfillment_label": fulfillment_label,
    }


def list_platform_payments(
    *,
    search: str = "",
    source: str = "",
    payout_status: str = "",
    limit: int = 200,
) -> list[dict]:
    """List shop orders + service bookings that have marketplace money fields."""
    rows: list[dict] = []
    q = search.strip().lower()
    source_filter = source.strip().lower()
    payout_filter = payout_status.strip().lower()
    include_none = payout_filter in ("all", "*")
    # Default desk view: money in flight or settled (skip unpaid "none")
    default_active = not payout_filter

    def include(row: dict) -> bool:
        if source_filter and row["source"] != source_filter:
            return False
        if include_none:
            pass
        elif payout_filter:
            if row["payout_status"] != payout_filter:
                return False
        elif default_active and row["payout_status"] == PayoutStatus.NONE:
            return False
        if q and not any(
            q in (v or "").lower()
            for v in (
                row["title"],
                row["buyer_username"],
                row["seller_username"],
                row["mock_payment_ref"],
                row["source_label"],
                row["payout_status_label"],
            )
        ):
            return False
        return True

    if not source_filter or source_filter == "shop":
        for order in Order.objects.select_related("buyer", "seller").order_by("-created_at")[:150]:
            row = _payment_row(
                source="shop",
                record_id=order.pk,
                buyer_username=order.buyer.username,
                seller_username=order.seller.username,
                title=f"Order {order.order_ref}",
                status=order.status,
                total=_money(order.total),
                platform_fee=_money(order.platform_fee),
                seller_payout=_money(order.seller_payout),
                payout_status=order.payout_status,
                paid_at=order.paid_at,
                payout_released_at=order.payout_released_at,
                mock_payment_ref=order.mock_payment_ref or "",
                created_at=order.created_at,
                fulfillment_label=order.get_fulfillment_type_display()
                if hasattr(order, "get_fulfillment_type_display")
                else "",
            )
            if include(row):
                rows.append(row)

    if not source_filter or source_filter == "accommodation":
        for b in AccommodationBooking.objects.select_related("guest", "listing", "listing__owner").order_by(
            "-created_at"
        )[:150]:
            row = _payment_row(
                source="accommodation",
                record_id=b.pk,
                buyer_username=b.guest.username,
                seller_username=b.listing.owner.username,
                title=b.listing.title,
                status=b.status,
                total=_money(b.total_price),
                platform_fee=_money(b.platform_fee),
                seller_payout=_money(b.seller_payout),
                payout_status=b.payout_status,
                paid_at=b.paid_at,
                payout_released_at=b.payout_released_at,
                mock_payment_ref=b.mock_payment_ref or "",
                created_at=b.created_at,
            )
            if include(row):
                rows.append(row)

    if not source_filter or source_filter == "guide":
        for b in GuideBooking.objects.select_related("client", "guide", "guide__user").order_by("-created_at")[:150]:
            row = _payment_row(
                source="guide",
                record_id=b.pk,
                buyer_username=b.client.username,
                seller_username=b.guide.user.username,
                title=b.guide.headline,
                status=b.status,
                total=_money(b.total_price),
                platform_fee=_money(b.platform_fee),
                seller_payout=_money(b.seller_payout),
                payout_status=b.payout_status,
                paid_at=b.paid_at,
                payout_released_at=b.payout_released_at,
                mock_payment_ref=b.mock_payment_ref or "",
                created_at=b.created_at,
            )
            if include(row):
                rows.append(row)

    if not source_filter or source_filter == "vehicle":
        for b in VehicleRentalBooking.objects.select_related("renter", "listing", "listing__owner").order_by(
            "-created_at"
        )[:150]:
            row = _payment_row(
                source="vehicle",
                record_id=b.pk,
                buyer_username=b.renter.username,
                seller_username=b.listing.owner.username,
                title=b.listing.title,
                status=b.status,
                total=_money(b.total_price),
                platform_fee=_money(b.platform_fee),
                seller_payout=_money(b.seller_payout),
                payout_status=b.payout_status,
                paid_at=b.paid_at,
                payout_released_at=b.payout_released_at,
                mock_payment_ref=b.mock_payment_ref or "",
                created_at=b.created_at,
            )
            if include(row):
                rows.append(row)

    if not source_filter or source_filter == "bus_seat":
        for b in SeatReservation.objects.select_related(
            "passenger", "trip", "trip__route", "trip__route__operator", "trip__route__operator__owner"
        ).order_by("-created_at")[:150]:
            route = b.trip.route
            title = f"{route.origin} → {route.destination} · seat {b.seat_number}"
            total = b.total_price if getattr(b, "total_price", None) else b.trip.price
            row = _payment_row(
                source="bus_seat",
                record_id=b.pk,
                buyer_username=b.passenger.username,
                seller_username=route.operator.owner.username,
                title=title,
                status=b.status,
                total=_money(total),
                platform_fee=_money(b.platform_fee),
                seller_payout=_money(b.seller_payout),
                payout_status=b.payout_status,
                paid_at=b.paid_at,
                payout_released_at=b.payout_released_at,
                mock_payment_ref=b.mock_payment_ref or "",
                created_at=b.created_at,
            )
            if include(row):
                rows.append(row)

    held = [r for r in rows if r["payout_status"] == PayoutStatus.HELD]
    rest = [r for r in rows if r["payout_status"] != PayoutStatus.HELD]
    held.sort(key=lambda r: r["created_at"] or "", reverse=True)
    rest.sort(key=lambda r: r["created_at"] or "", reverse=True)
    return (held + rest)[:limit]


def get_platform_payment_detail(source: str, record_id: int) -> dict | None:
    source = (source or "").strip().lower()
    pk = int(record_id)

    if source == "shop":
        order = Order.objects.select_related("buyer", "seller").prefetch_related("items").filter(pk=pk).first()
        if not order:
            return None
        items = [
            {
                "id": item.pk,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "unit_price": _money(item.unit_price),
                "line_total": _money(item.line_total),
            }
            for item in order.items.all()
        ]
        row = _payment_row(
            source="shop",
            record_id=order.pk,
            buyer_username=order.buyer.username,
            seller_username=order.seller.username,
            title=f"Order {order.order_ref}",
            status=order.status,
            total=_money(order.total),
            platform_fee=_money(order.platform_fee),
            seller_payout=_money(order.seller_payout),
            payout_status=order.payout_status,
            paid_at=order.paid_at,
            payout_released_at=order.payout_released_at,
            mock_payment_ref=order.mock_payment_ref or "",
            created_at=order.created_at,
            fulfillment_label=order.get_fulfillment_type_display()
            if hasattr(order, "get_fulfillment_type_display")
            else "",
        )
        row["order_ref"] = order.order_ref
        row["items"] = items
        row["shipping_total"] = _money(order.shipping_total)
        row["tracking_number"] = order.tracking_number or ""
        return row

    if source == "accommodation":
        b = AccommodationBooking.objects.select_related("guest", "listing", "listing__owner").filter(pk=pk).first()
        if not b:
            return None
        row = _payment_row(
            source="accommodation",
            record_id=b.pk,
            buyer_username=b.guest.username,
            seller_username=b.listing.owner.username,
            title=b.listing.title,
            status=b.status,
            total=_money(b.total_price),
            platform_fee=_money(b.platform_fee),
            seller_payout=_money(b.seller_payout),
            payout_status=b.payout_status,
            paid_at=b.paid_at,
            payout_released_at=b.payout_released_at,
            mock_payment_ref=b.mock_payment_ref or "",
            created_at=b.created_at,
        )
        row["check_in"] = b.check_in.isoformat()
        row["check_out"] = b.check_out.isoformat()
        row["guests"] = b.guests
        return row

    if source == "guide":
        b = GuideBooking.objects.select_related("client", "guide", "guide__user").filter(pk=pk).first()
        if not b:
            return None
        row = _payment_row(
            source="guide",
            record_id=b.pk,
            buyer_username=b.client.username,
            seller_username=b.guide.user.username,
            title=b.guide.headline,
            status=b.status,
            total=_money(b.total_price),
            platform_fee=_money(b.platform_fee),
            seller_payout=_money(b.seller_payout),
            payout_status=b.payout_status,
            paid_at=b.paid_at,
            payout_released_at=b.payout_released_at,
            mock_payment_ref=b.mock_payment_ref or "",
            created_at=b.created_at,
        )
        row["date"] = b.date.isoformat()
        row["group_size"] = b.group_size
        return row

    if source == "vehicle":
        b = VehicleRentalBooking.objects.select_related("renter", "listing", "listing__owner").filter(pk=pk).first()
        if not b:
            return None
        row = _payment_row(
            source="vehicle",
            record_id=b.pk,
            buyer_username=b.renter.username,
            seller_username=b.listing.owner.username,
            title=b.listing.title,
            status=b.status,
            total=_money(b.total_price),
            platform_fee=_money(b.platform_fee),
            seller_payout=_money(b.seller_payout),
            payout_status=b.payout_status,
            paid_at=b.paid_at,
            payout_released_at=b.payout_released_at,
            mock_payment_ref=b.mock_payment_ref or "",
            created_at=b.created_at,
        )
        row["start_date"] = b.start_date.isoformat()
        row["end_date"] = b.end_date.isoformat()
        return row

    if source == "bus_seat":
        b = (
            SeatReservation.objects.select_related(
                "passenger", "trip", "trip__route", "trip__route__operator", "trip__route__operator__owner"
            )
            .filter(pk=pk)
            .first()
        )
        if not b:
            return None
        route = b.trip.route
        total = b.total_price if getattr(b, "total_price", None) else b.trip.price
        row = _payment_row(
            source="bus_seat",
            record_id=b.pk,
            buyer_username=b.passenger.username,
            seller_username=route.operator.owner.username,
            title=f"{route.origin} → {route.destination} · seat {b.seat_number}",
            status=b.status,
            total=_money(total),
            platform_fee=_money(b.platform_fee),
            seller_payout=_money(b.seller_payout),
            payout_status=b.payout_status,
            paid_at=b.paid_at,
            payout_released_at=b.payout_released_at,
            mock_payment_ref=b.mock_payment_ref or "",
            created_at=b.created_at,
        )
        row["seat_number"] = b.seat_number
        row["departs_at"] = _iso(b.trip.departs_at)
        return row

    return None
