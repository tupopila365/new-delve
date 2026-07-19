"""Seller trust snapshot — verification + fulfillment / dispute / cancel rates."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Case, IntegerField, Q, Value, When

from accommodation.models import BookingStatus
from accounts.marketplace_payout import PayoutStatus
from accounts.models import BusinessProfile, MarketplaceDispute, VerificationStatus
from shop.models import Order, OrderStatus

User = get_user_model()

# Hide rates until there is enough history (avoids harsh 0% / 100% on first sale).
MIN_RATE_SAMPLE = 5

SHOP_FULFILLMENT_DENOM = (
    OrderStatus.PAID,
    OrderStatus.READY,
    OrderStatus.SHIPPED,
    OrderStatus.FULFILLED,
)

SHOP_CANCEL_DENOM = SHOP_FULFILLMENT_DENOM + (
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
)

BOOKING_CANCEL_DENOM = (
    BookingStatus.CONFIRMED,
    BookingStatus.CHECKED_IN,
    BookingStatus.CHECKED_OUT,
    BookingStatus.CANCELLED,
    BookingStatus.REFUNDED,
)


def _pct(numerator: int, denominator: int) -> float | None:
    if denominator < MIN_RATE_SAMPLE or denominator <= 0:
        return None
    return round(numerator / denominator, 4)


def _booking_counts_for_owner(owner_id: int) -> tuple[int, int]:
    """Return (released_count, countable_count) across booking verticals."""
    released = 0
    total = 0
    payout_q = Q(payout_status__in=[PayoutStatus.HELD, PayoutStatus.RELEASED, PayoutStatus.REFUNDED])

    from accommodation.models import AccommodationBooking
    from guides.models import GuideBooking
    from transport.models import SeatReservation, VehicleRentalBooking

    for qs in (
        AccommodationBooking.objects.filter(listing__owner_id=owner_id).filter(payout_q),
        GuideBooking.objects.filter(guide__user_id=owner_id).filter(payout_q),
        VehicleRentalBooking.objects.filter(listing__owner_id=owner_id).filter(payout_q),
        SeatReservation.objects.filter(trip__route__operator__owner_id=owner_id).filter(payout_q),
    ):
        total += qs.count()
        released += qs.filter(payout_status=PayoutStatus.RELEASED).count()

    return released, total


def _booking_cancel_counts_for_owner(owner_id: int) -> tuple[int, int]:
    """Return (cancelled_count, denom_count) for stay / guide / vehicle / bus."""
    cancelled = 0
    total = 0

    from accommodation.models import AccommodationBooking
    from guides.models import GuideBooking
    from transport.models import SeatReservation, VehicleRentalBooking

    stay_qs = AccommodationBooking.objects.filter(
        listing__owner_id=owner_id, status__in=BOOKING_CANCEL_DENOM
    )
    total += stay_qs.count()
    cancelled += stay_qs.filter(status=BookingStatus.CANCELLED).count()

    vehicle_qs = VehicleRentalBooking.objects.filter(
        listing__owner_id=owner_id, status__in=BOOKING_CANCEL_DENOM
    )
    total += vehicle_qs.count()
    cancelled += vehicle_qs.filter(status=BookingStatus.CANCELLED).count()

    bus_qs = SeatReservation.objects.filter(
        trip__route__operator__owner_id=owner_id, status__in=BOOKING_CANCEL_DENOM
    )
    total += bus_qs.count()
    cancelled += bus_qs.filter(status=BookingStatus.CANCELLED).count()

    # Guide status is a free-form string historically.
    guide_qs = GuideBooking.objects.filter(guide__user_id=owner_id).exclude(
        status__iexact="pending"
    )
    total += guide_qs.count()
    cancelled += guide_qs.filter(status__iexact="cancelled").count()

    return cancelled, total


def _badge_labels(
    *,
    business_verified: bool,
    fulfillment_rate: float | None,
    dispute_rate: float | None,
    cancel_rate: float | None,
    fulfillment_total: int,
) -> list[dict]:
    badges: list[dict] = []
    if business_verified:
        badges.append({"id": "verified", "label": "Verified business", "variant": "success"})
    if fulfillment_rate is not None:
        pct = int(round(fulfillment_rate * 100))
        badges.append(
            {
                "id": "fulfillment",
                "label": f"{pct}% fulfilled",
                "variant": "success" if fulfillment_rate >= 0.9 else "default",
            }
        )
    elif fulfillment_total > 0:
        badges.append(
            {
                "id": "fulfillment_building",
                "label": "Building track record",
                "variant": "default",
            }
        )
    if dispute_rate is not None:
        if dispute_rate <= 0.05:
            badges.append({"id": "disputes_low", "label": "Low dispute rate", "variant": "success"})
        elif dispute_rate >= 0.2:
            badges.append({"id": "disputes_elevated", "label": "Elevated disputes", "variant": "urgency"})
    if cancel_rate is not None:
        if cancel_rate <= 0.10:
            badges.append({"id": "cancel_low", "label": "Low cancel rate", "variant": "success"})
        elif cancel_rate >= 0.25:
            badges.append({"id": "cancel_high", "label": "High cancel rate", "variant": "urgency"})
    return badges


def get_seller_trust(
    *,
    username: str | None = None,
    user_id: int | None = None,
    business_id: int | None = None,
) -> dict:
    user = None
    business = None

    if business_id is not None:
        business = BusinessProfile.objects.filter(pk=business_id).select_related("owner").first()
        if not business:
            raise LookupError("Business not found.")
        user = business.owner
    elif user_id is not None:
        user = User.objects.filter(pk=user_id).first()
    elif username:
        user = User.objects.filter(username__iexact=username.strip()).first()

    if not user:
        raise LookupError("Seller not found.")

    if business is None:
        verified_first = Case(
            When(verification_status=VerificationStatus.VERIFIED, then=Value(0)),
            default=Value(1),
            output_field=IntegerField(),
        )
        business = (
            BusinessProfile.objects.filter(owner_id=user.pk)
            .order_by(verified_first, "-updated_at")
            .first()
        )

    verification_status = business.verification_status if business else VerificationStatus.UNVERIFIED
    business_verified = verification_status == VerificationStatus.VERIFIED

    shop_qs = Order.objects.filter(seller_id=user.pk, status__in=SHOP_FULFILLMENT_DENOM)
    shop_total = shop_qs.count()
    shop_done = shop_qs.filter(
        Q(status=OrderStatus.FULFILLED) | Q(payout_status=PayoutStatus.RELEASED)
    ).count()

    book_done, book_total = _booking_counts_for_owner(user.pk)
    fulfillment_completed = shop_done + book_done
    fulfillment_total = shop_total + book_total

    shop_cancel_qs = Order.objects.filter(seller_id=user.pk, status__in=SHOP_CANCEL_DENOM)
    shop_cancel_total = shop_cancel_qs.count()
    shop_cancelled = shop_cancel_qs.filter(status=OrderStatus.CANCELLED).count()
    book_cancelled, book_cancel_total = _booking_cancel_counts_for_owner(user.pk)
    cancels_total = shop_cancelled + book_cancelled
    cancel_sample = shop_cancel_total + book_cancel_total

    disputes_total = MarketplaceDispute.objects.filter(seller_id=user.pk).count()
    fulfillment_rate = _pct(fulfillment_completed, fulfillment_total)
    dispute_rate = _pct(disputes_total, fulfillment_total) if fulfillment_total else None
    cancel_rate = _pct(cancels_total, cancel_sample)

    listing_go_live_allowed = business_verified
    payout_release_allowed = business_verified or fulfillment_completed >= MIN_RATE_SAMPLE
    go_live_hold_reason = (
        ""
        if listing_go_live_allowed
        else "Verify your business before publishing stays, guides, or transport listings."
    )
    payout_hold_reason = (
        ""
        if payout_release_allowed
        else (
            "Payouts stay held until your business is verified "
            f"or you complete at least {MIN_RATE_SAMPLE} fulfillments."
        )
    )

    return {
        "seller_user_id": user.pk,
        "seller_username": user.username,
        "business_id": business.pk if business else None,
        "business_name": business.business_name if business else "",
        "business_verified": business_verified,
        "verification_status": verification_status,
        "fulfillment_completed": fulfillment_completed,
        "fulfillment_total": fulfillment_total,
        "fulfillment_rate": fulfillment_rate,
        "disputes_total": disputes_total,
        "dispute_rate": dispute_rate,
        "cancels_total": cancels_total,
        "cancel_sample": cancel_sample,
        "cancel_rate": cancel_rate,
        "min_sample": MIN_RATE_SAMPLE,
        "badges": _badge_labels(
            business_verified=business_verified,
            fulfillment_rate=fulfillment_rate,
            dispute_rate=dispute_rate,
            cancel_rate=cancel_rate,
            fulfillment_total=fulfillment_total,
        ),
        "gates": {
            "listing_go_live_allowed": listing_go_live_allowed,
            "payout_release_allowed": payout_release_allowed,
            "go_live_hold_reason": go_live_hold_reason,
            "payout_hold_reason": payout_hold_reason,
            "is_new_seller": fulfillment_completed < MIN_RATE_SAMPLE,
        },
    }


def seller_may_receive_payout(user) -> bool:
    if user is None:
        return False
    return bool(get_seller_trust(user_id=user.pk)["gates"]["payout_release_allowed"])


def seller_may_go_live(user) -> bool:
    if user is None:
        return False
    return bool(get_seller_trust(user_id=user.pk)["gates"]["listing_go_live_allowed"])


def go_live_block_message(user) -> str:
    snap = get_seller_trust(user_id=user.pk)
    return snap["gates"]["go_live_hold_reason"] or "Business verification required."


def resolve_booking_seller(booking):
    """Best-effort owner/user for a marketplace booking instance."""
    listing = getattr(booking, "listing", None)
    if listing is not None and getattr(listing, "owner", None) is not None:
        return listing.owner
    guide = getattr(booking, "guide", None)
    if guide is not None and getattr(guide, "user", None) is not None:
        return guide.user
    trip = getattr(booking, "trip", None)
    if trip is not None:
        route = getattr(trip, "route", None)
        operator = getattr(route, "operator", None) if route else None
        owner = getattr(operator, "owner", None) if operator else None
        if owner is not None:
            return owner
    return None


def enforce_service_go_live(*, user, wanting_active: bool) -> None:
    """Raise DRF ValidationError when publishing without verification."""
    if not wanting_active:
        return
    if seller_may_go_live(user):
        return
    from rest_framework import serializers

    raise serializers.ValidationError({"is_active": go_live_block_message(user)})
