"""Shop seller readiness — email, profile, phone, payout (no ID documents)."""

from __future__ import annotations

from django.core.cache import cache
from django.utils import timezone

from .models import ShopProduct, ShopProfile

# Caps before stronger trust steps.
MAX_ACTIVE_WITHOUT_PHONE = 5
MAX_ACTIVE_WITH_PHONE = 40
MAX_ACTIVE_TRUSTED = 200

OTP_TTL_SECONDS = 10 * 60
OTP_CACHE_PREFIX = "shop_phone_otp:"


def get_or_create_shop_profile(user) -> ShopProfile:
    profile, _ = ShopProfile.objects.get_or_create(owner_id=user.pk)
    return profile


def email_verified(user) -> bool:
    profile = getattr(user, "profile", None)
    return bool(getattr(profile, "email_verified", False))


def shop_profile_complete(shop: ShopProfile | None) -> bool:
    if shop is None:
        return False
    return bool(
        (shop.display_name or "").strip()
        and (shop.region or "").strip()
        and (shop.city or "").strip()
        and (shop.fulfillment_notes or "").strip()
    )


def phone_verified(shop: ShopProfile | None) -> bool:
    if shop is None:
        return False
    return bool((shop.phone or "").strip() and shop.phone_verified_at)


def payout_details_complete(shop: ShopProfile | None) -> bool:
    if shop is None:
        return False
    method = (shop.payout_method or "").strip()
    name = (shop.payout_account_name or "").strip()
    number = (shop.payout_account_number or "").strip()
    return bool(method and name and number)


def active_product_count(user) -> int:
    return ShopProduct.objects.filter(owner_id=user.pk, is_active=True).count()


def max_active_listings(user, shop: ShopProfile | None = None) -> int:
    shop = shop or ShopProfile.objects.filter(owner_id=user.pk).first()
    if phone_verified(shop) and payout_details_complete(shop):
        # "Trusted" without ID: phone + payout + a few fulfilled sales.
        from .models import Order, OrderStatus

        fulfilled = Order.objects.filter(seller_id=user.pk, status=OrderStatus.FULFILLED).count()
        if fulfilled >= 5:
            return MAX_ACTIVE_TRUSTED
        return MAX_ACTIVE_WITH_PHONE
    if phone_verified(shop):
        return MAX_ACTIVE_WITH_PHONE
    return MAX_ACTIVE_WITHOUT_PHONE


def can_publish_product(user, *, shop: ShopProfile | None = None, activating: bool = True) -> tuple[bool, str]:
    """Whether the seller may set is_active=True on a product."""
    if not activating:
        return True, ""
    if not email_verified(user):
        return False, "Verify your email before publishing products."
    shop = shop or get_or_create_shop_profile(user)
    if not shop_profile_complete(shop):
        return (
            False,
            "Complete your shop profile (name, region, city, and how buyers get their items) before publishing.",
        )
    limit = max_active_listings(user, shop)
    # Allow republishing an already-active product without counting twice — caller adjusts.
    if active_product_count(user) >= limit:
        if not phone_verified(shop):
            return (
                False,
                f"You can publish up to {limit} products until your phone is verified. Verify your phone in shop settings.",
            )
        return False, f"You have reached the limit of {limit} published products for your seller level."
    return True, ""


def can_accept_paid_orders(user, *, shop: ShopProfile | None = None) -> tuple[bool, str]:
    shop = shop or ShopProfile.objects.filter(owner_id=user.pk).first()
    if not email_verified(user):
        return False, "This seller has not verified their email yet."
    if not shop_profile_complete(shop):
        return False, "This seller has not finished setting up their shop."
    if not phone_verified(shop):
        return False, "This seller cannot accept paid orders until their phone is verified."
    return True, ""


def can_receive_payout(user, *, shop: ShopProfile | None = None) -> tuple[bool, str]:
    shop = shop or ShopProfile.objects.filter(owner_id=user.pk).first()
    ok, reason = can_accept_paid_orders(user, shop=shop)
    if not ok:
        return False, reason
    if not payout_details_complete(shop):
        return False, "Add payout details in shop settings before funds can be released."
    return True, ""


def seller_readiness(user) -> dict:
    shop = get_or_create_shop_profile(user)
    email_ok = email_verified(user)
    profile_ok = shop_profile_complete(shop)
    phone_ok = phone_verified(shop)
    payout_ok = payout_details_complete(shop)
    publish_ok, publish_reason = can_publish_product(user, shop=shop, activating=True)
    # publish_ok may fail on cap — still report checklist separately
    orders_ok, orders_reason = can_accept_paid_orders(user, shop=shop)
    payout_gate_ok, payout_reason = can_receive_payout(user, shop=shop)
    active = active_product_count(user)
    limit = max_active_listings(user, shop)
    return {
        "email_verified": email_ok,
        "profile_complete": profile_ok,
        "phone_verified": phone_ok,
        "payout_details_complete": payout_ok,
        "can_publish": email_ok and profile_ok and active < limit,
        "can_publish_reason": "" if (email_ok and profile_ok and active < limit) else publish_reason,
        "can_accept_orders": orders_ok,
        "can_accept_orders_reason": orders_reason,
        "can_receive_payout": payout_gate_ok,
        "can_receive_payout_reason": payout_reason,
        "active_listings": active,
        "max_active_listings": limit,
        "checklist": [
            {"id": "email", "label": "Email verified", "done": email_ok},
            {"id": "profile", "label": "Shop profile complete", "done": profile_ok},
            {"id": "phone", "label": "Phone verified", "done": phone_ok},
            {"id": "payout", "label": "Payout details saved", "done": payout_ok},
        ],
    }


def otp_cache_key(user_id: int) -> str:
    return f"{OTP_CACHE_PREFIX}{user_id}"


def store_phone_otp(user_id: int, phone: str, code: str) -> None:
    cache.set(
        otp_cache_key(user_id),
        {"phone": phone, "code": code, "created": timezone.now().isoformat()},
        OTP_TTL_SECONDS,
    )


def pop_phone_otp(user_id: int) -> dict | None:
    key = otp_cache_key(user_id)
    data = cache.get(key)
    return data if isinstance(data, dict) else None
