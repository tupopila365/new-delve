"""Promotion payment, refund, and receipt helpers."""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.utils import timezone

from promotions.models import PaymentStatus, PromotionCampaign, PromotionPlacement, PromotionStatus
from promotions.services import placement_conflict_summary


def format_money(cents: int, currency: str = "NAD") -> str:
    amount = Decimal(cents) / Decimal(100)
    symbol = "N$" if currency == "NAD" else currency
    return f"{symbol}{amount:,.2f}"


def receipt_number_for(campaign: PromotionCampaign) -> str:
    if campaign.receipt_number:
        return campaign.receipt_number
    return f"DELVE-PR-{campaign.pk:06d}"


def build_receipt(campaign: PromotionCampaign) -> dict:
    product = campaign.product
    return {
        "receipt_number": receipt_number_for(campaign),
        "campaign_id": campaign.pk,
        "product_name": product.name if product else campaign.placement_label,
        "target_label": campaign.target_label,
        "placement_label": campaign.get_placement_display(),
        "region": campaign.region or "National",
        "starts_at": campaign.starts_at.isoformat(),
        "ends_at": campaign.ends_at.isoformat(),
        "amount_cents": campaign.amount_cents,
        "amount_display": format_money(campaign.amount_cents, campaign.currency),
        "currency": campaign.currency,
        "payment_ref": campaign.payment_ref,
        "paid_at": campaign.paid_at.isoformat() if campaign.paid_at else None,
        "payment_status": campaign.payment_status,
        "status": campaign.status,
        "status_label": campaign.get_status_display(),
    }


def calculate_refund(campaign: PromotionCampaign) -> tuple[int, str]:
    if campaign.payment_status != PaymentStatus.PAID:
        return 0, "No payment to refund."

    now = timezone.now()
    if now < campaign.starts_at:
        return campaign.amount_cents, "Full refund — cancelled before the campaign starts."

    if now >= campaign.ends_at:
        return 0, "Campaign has ended — no refund."

    total_seconds = max(1, (campaign.ends_at - campaign.starts_at).total_seconds())
    remaining_seconds = max(0, (campaign.ends_at - now).total_seconds())
    unused_ratio = remaining_seconds / total_seconds

    if campaign.status == PromotionStatus.ACTIVE:
        refund = int(campaign.amount_cents * unused_ratio * 0.5)
        if refund <= 0:
            return 0, "No refund — less than one day unused."
        return refund, f"Partial refund — 50% of unused time ({int(unused_ratio * 100)}% remaining)."

    if campaign.status == PromotionStatus.SCHEDULED and now >= campaign.starts_at:
        return 0, "Campaign already started — no refund."

    return campaign.amount_cents, "Full refund — cancelled before start."


def complete_mock_payment(campaign: PromotionCampaign, *, actor) -> PromotionCampaign:
    if campaign.status != PromotionStatus.PENDING_PAYMENT:
        raise ValueError("Campaign is not awaiting payment.")
    if campaign.requested_by_id and campaign.requested_by_id != actor.id:
        raise PermissionError("Forbidden")
    if campaign.created_by_id and campaign.created_by_id != actor.id and campaign.requested_by_id != actor.id:
        raise PermissionError("Forbidden")

    conflict = placement_conflict_summary(
        placement=campaign.placement,
        starts_at=campaign.starts_at,
        ends_at=campaign.ends_at,
        region=(campaign.region or "").strip(),
        exclude_id=campaign.pk,
        target_type=campaign.target_type if campaign.placement == PromotionPlacement.CATEGORY_SPOTLIGHT else None,
    )
    if conflict["has_conflict"]:
        raise ValueError("; ".join(conflict["warnings"]))

    campaign.payment_status = PaymentStatus.PAID
    campaign.payment_provider = "mock"
    campaign.payment_ref = f"mock_{uuid.uuid4().hex[:16]}"
    campaign.paid_at = timezone.now()
    campaign.amount_cents = campaign.amount_cents or (campaign.product.price_cents if campaign.product else 0)
    campaign.currency = campaign.currency or (campaign.product.currency if campaign.product else "NAD")
    if not campaign.receipt_number:
        campaign.receipt_number = f"DELVE-PR-{campaign.pk:06d}"
    campaign.status = PromotionStatus.SCHEDULED
    campaign.save()
    return campaign


def cancel_with_refund(campaign: PromotionCampaign, *, actor, reason: str = "") -> tuple[PromotionCampaign, int, str]:
    if campaign.requested_by_id and campaign.requested_by_id != actor.id:
        raise PermissionError("Forbidden")
    if campaign.created_by_id and campaign.created_by_id != actor.id and campaign.requested_by_id != actor.id:
        raise PermissionError("Forbidden")

    if campaign.status in (PromotionStatus.CANCELLED, PromotionStatus.EXPIRED, PromotionStatus.REFUNDED):
        raise ValueError("Campaign cannot be cancelled.")

    refund_cents, refund_note = calculate_refund(campaign)
    campaign.status = PromotionStatus.REFUNDED if refund_cents > 0 else PromotionStatus.CANCELLED
    if refund_cents > 0:
        campaign.payment_status = PaymentStatus.REFUNDED
        campaign.refund_amount_cents = refund_cents
        campaign.refunded_at = timezone.now()
        campaign.refund_reason = (reason or refund_note).strip()
    else:
        campaign.status = PromotionStatus.CANCELLED
        campaign.refund_reason = (reason or refund_note).strip()
    campaign.save()
    return campaign, refund_cents, refund_note
