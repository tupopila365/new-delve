"""Promotion performance metrics, engagement ranking, and analytics."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.db.models import Q
from django.utils import timezone

from promotions.models import PromotionCampaign, PromotionStatus, PromotionTargetType

MIN_IMPRESSIONS_FOR_CTR = 50
BASELINE_CTR = 0.02
POOR_CTR_THRESHOLD = 0.01


def record_promotion_event(campaign_id: int, event: str) -> bool:
    from django.db.models import F

    field_map = {
        "impression": "impressions",
        "click": "clicks",
        "open": "listing_opens",
    }
    field = field_map.get(event)
    if not field:
        return False

    updated = PromotionCampaign.objects.filter(pk=campaign_id).exclude(
        status__in=[
            PromotionStatus.CANCELLED,
            PromotionStatus.REJECTED,
            PromotionStatus.PENDING_PAYMENT,
            PromotionStatus.REFUNDED,
        ]
    ).update(**{field: F(field) + 1})
    return updated > 0


def ctr(campaign: PromotionCampaign) -> float:
    if campaign.impressions <= 0:
        return 0.0
    return round(campaign.clicks / campaign.impressions, 4)


def open_rate(campaign: PromotionCampaign) -> float:
    if campaign.clicks <= 0:
        return 0.0
    return round(campaign.listing_opens / campaign.clicks, 4)


def engagement_multiplier(campaign: PromotionCampaign) -> float:
    """Reduce effective priority when paid content underperforms on CTR."""
    if campaign.impressions < MIN_IMPRESSIONS_FOR_CTR:
        return 1.0
    rate = ctr(campaign)
    if rate < POOR_CTR_THRESHOLD:
        return 0.45
    if rate < BASELINE_CTR:
        return 0.72
    if rate >= BASELINE_CTR * 2:
        return 1.15
    if rate >= BASELINE_CTR * 1.25:
        return 1.05
    return 1.0


def effective_priority(campaign: PromotionCampaign) -> float:
    return round(campaign.priority * engagement_multiplier(campaign), 2)


def is_underperforming(campaign: PromotionCampaign) -> bool:
    return campaign.impressions >= MIN_IMPRESSIONS_FOR_CTR and ctr(campaign) < POOR_CTR_THRESHOLD


def rank_campaigns_by_engagement(campaigns: list[PromotionCampaign]) -> list[PromotionCampaign]:
    return sorted(
        campaigns,
        key=lambda c: (effective_priority(c), c.starts_at),
        reverse=True,
    )


def booking_count_for_campaign(campaign: PromotionCampaign) -> int:
    """Confirmed bookings on the promoted listing during the campaign window."""
    try:
        target_id = int(campaign.target_id)
    except (TypeError, ValueError):
        return 0

    window = Q(created_at__gte=campaign.starts_at, created_at__lte=campaign.ends_at)

    if campaign.target_type == PromotionTargetType.ACCOMMODATION:
        from accommodation.models import AccommodationBooking, BookingStatus

        return AccommodationBooking.objects.filter(
            listing_id=target_id,
            status__in=[BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT],
        ).filter(window).count()

    if campaign.target_type == PromotionTargetType.GUIDE:
        from guides.models import GuideBooking

        return GuideBooking.objects.filter(guide_id=target_id, status="confirmed").filter(window).count()

    if campaign.target_type == PromotionTargetType.VEHICLE:
        from transport.models import VehicleRentalBooking
        from accommodation.models import BookingStatus

        return VehicleRentalBooking.objects.filter(
            listing_id=target_id,
            status__in=[BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT],
        ).filter(window).count()

    if campaign.target_type == PromotionTargetType.BUS_TRIP:
        from transport.models import SeatReservation
        from accommodation.models import BookingStatus

        return SeatReservation.objects.filter(
            trip_id=target_id,
            status__in=[BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT],
        ).filter(window).count()

    return 0


def campaign_metrics(campaign: PromotionCampaign) -> dict[str, Any]:
    bookings = booking_count_for_campaign(campaign)
    click_rate = ctr(campaign)
    opens = campaign.listing_opens
    booking_rate = round(bookings / opens, 4) if opens > 0 else 0.0
    spend = campaign.amount_cents if campaign.payment_status == "paid" else 0
    roi_proxy = round(bookings / (spend / 100), 2) if spend > 0 and bookings > 0 else None

    return {
        "impressions": campaign.impressions,
        "clicks": campaign.clicks,
        "listing_opens": opens,
        "bookings": bookings,
        "ctr": click_rate,
        "ctr_pct": round(click_rate * 100, 2),
        "open_rate": open_rate(campaign),
        "open_rate_pct": round(open_rate(campaign) * 100, 2),
        "booking_rate": booking_rate,
        "booking_rate_pct": round(booking_rate * 100, 2),
        "engagement_multiplier": engagement_multiplier(campaign),
        "effective_priority": effective_priority(campaign),
        "underperforming": is_underperforming(campaign),
        "amount_cents": spend,
        "roi_proxy": roi_proxy,
    }


def admin_promotion_analytics(*, days: int = 30) -> dict[str, Any]:
    days = max(7, min(days, 90))
    since = timezone.now() - timedelta(days=days)

    live_statuses = [
        PromotionStatus.SCHEDULED,
        PromotionStatus.ACTIVE,
        PromotionStatus.EXPIRED,
    ]
    qs = PromotionCampaign.objects.filter(
        Q(created_at__gte=since) | Q(status__in=[PromotionStatus.ACTIVE, PromotionStatus.SCHEDULED])
    ).select_related("product")

    campaigns = list(qs.order_by("-starts_at")[:100])
    rows = []
    total_impressions = 0
    total_clicks = 0
    total_opens = 0
    total_bookings = 0
    total_revenue = 0
    underperforming_count = 0

    for c in campaigns:
        m = campaign_metrics(c)
        total_impressions += m["impressions"]
        total_clicks += m["clicks"]
        total_opens += m["listing_opens"]
        total_bookings += m["bookings"]
        if c.payment_status == "paid":
            total_revenue += c.amount_cents
        if m["underperforming"]:
            underperforming_count += 1
        rows.append(
            {
                "id": c.pk,
                "target_label": c.target_label,
                "placement": c.placement,
                "placement_label": c.get_placement_display(),
                "region": c.region or "National",
                "status": c.status,
                "status_label": c.get_status_display(),
                "priority": c.priority,
                "starts_at": c.starts_at.isoformat(),
                "ends_at": c.ends_at.isoformat(),
                **m,
            }
        )

    rows.sort(key=lambda r: r["impressions"], reverse=True)

    aggregate_ctr = round(total_clicks / total_impressions, 4) if total_impressions else 0

    by_placement: dict[str, dict] = {}
    for row in rows:
        bucket = by_placement.setdefault(
            row["placement"],
            {"placement": row["placement"], "label": row["placement_label"], "impressions": 0, "clicks": 0, "bookings": 0},
        )
        bucket["impressions"] += row["impressions"]
        bucket["clicks"] += row["clicks"]
        bucket["bookings"] += row["bookings"]

    placement_rows = []
    for bucket in by_placement.values():
        imp = bucket["impressions"]
        bucket["ctr_pct"] = round((bucket["clicks"] / imp) * 100, 2) if imp else 0
        placement_rows.append(bucket)
    placement_rows.sort(key=lambda r: r["impressions"], reverse=True)

    return {
        "days": days,
        "totals": {
            "campaigns": len(rows),
            "impressions": total_impressions,
            "clicks": total_clicks,
            "listing_opens": total_opens,
            "bookings": total_bookings,
            "ctr_pct": round(aggregate_ctr * 100, 2),
            "revenue_cents": total_revenue,
            "underperforming": underperforming_count,
        },
        "funnel": [
            {"label": "Impressions", "value": total_impressions},
            {"label": "Clicks", "value": total_clicks},
            {"label": "Listing opens", "value": total_opens},
            {"label": "Bookings", "value": total_bookings},
        ],
        "by_placement": placement_rows,
        "campaigns": rows,
    }


def provider_promotion_analytics(user) -> dict[str, Any]:
    qs = PromotionCampaign.objects.filter(
        Q(requested_by=user) | Q(created_by=user, product__isnull=False)
    ).exclude(status=PromotionStatus.PENDING_PAYMENT).select_related("product").order_by("-starts_at")[:50]

    campaigns = list(qs)
    rows = []
    totals = {"impressions": 0, "clicks": 0, "listing_opens": 0, "bookings": 0, "spend_cents": 0}

    for c in campaigns:
        m = campaign_metrics(c)
        totals["impressions"] += m["impressions"]
        totals["clicks"] += m["clicks"]
        totals["listing_opens"] += m["listing_opens"]
        totals["bookings"] += m["bookings"]
        if c.payment_status == "paid":
            totals["spend_cents"] += c.amount_cents
        rows.append(
            {
                "id": c.pk,
                "target_label": c.target_label,
                "product_name": c.product.name if c.product else c.get_placement_display(),
                "status": c.status,
                "status_label": c.get_status_display(),
                "starts_at": c.starts_at.isoformat(),
                "ends_at": c.ends_at.isoformat(),
                **m,
            }
        )

    imp = totals["impressions"]
    totals["ctr_pct"] = round((totals["clicks"] / imp) * 100, 2) if imp else 0
    totals["roi_proxy"] = (
        round(totals["bookings"] / (totals["spend_cents"] / 100), 2)
        if totals["spend_cents"] > 0 and totals["bookings"] > 0
        else None
    )

    return {"totals": totals, "campaigns": rows}
