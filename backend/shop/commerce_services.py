"""Marketplace helpers — platform fee and payout hold/release for shop orders."""

from decimal import Decimal

from django.utils import timezone

from accounts.marketplace_payout import (
    PayoutStatus,
    compute_fee,
    shop_fee_percent,
)

from .models import Order, OrderStatus


def compute_platform_fee(items_total: Decimal) -> Decimal:
    """Fee is taken from items only; shipping fee stays with the seller."""
    return compute_fee(items_total or Decimal("0"), shop_fee_percent())


def apply_marketplace_totals(order: Order) -> None:
    """Set platform_fee + seller_payout from current items/shipping totals."""
    fee = compute_platform_fee(order.items_total or Decimal("0"))
    order.platform_fee = fee
    order.seller_payout = max(
        Decimal("0"),
        (order.total or Decimal("0")) - fee,
    )


def mark_payment_held(order: Order) -> list[str]:
    """Record mock/live payment capture — funds held until fulfillment."""
    apply_marketplace_totals(order)
    order.payout_status = PayoutStatus.HELD
    order.paid_at = timezone.now()
    return [
        "platform_fee",
        "seller_payout",
        "payout_status",
        "paid_at",
    ]


def release_seller_payout(order: Order) -> list[str]:
    """Release held funds to the seller (minus Delve fee)."""
    if order.payout_status != PayoutStatus.HELD:
        return []
    from accounts.seller_trust import seller_may_receive_payout

    if order.seller_id and not seller_may_receive_payout(order.seller):
        # Trust gate: keep held for unverified / new sellers.
        return []
    order.payout_status = PayoutStatus.RELEASED
    order.payout_released_at = timezone.now()
    return ["payout_status", "payout_released_at"]


def mark_fulfilled(order: Order) -> list[str]:
    """Complete the order and release the seller payout when held."""
    order.status = OrderStatus.FULFILLED
    order.fulfilled_at = timezone.now()
    fields = ["status", "fulfilled_at", "updated_at"]
    fields.extend(release_seller_payout(order))
    return fields


def mark_refunded(order: Order) -> list[str]:
    order.status = OrderStatus.REFUNDED
    order.payout_status = PayoutStatus.REFUNDED
    return ["status", "payout_status", "updated_at"]
