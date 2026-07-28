"""Resolve public shop name + avatar (prefer ShopProfile over user profile)."""

from __future__ import annotations

from common.media_urls import absolute_media_url
from common.user_display import display_name_or_none, profile_avatar_url


def shop_display_name(user) -> str:
    """Public shop title — ShopProfile.display_name, then profile name, then username."""
    shop = getattr(user, "shop_profile", None)
    shop_name = (getattr(shop, "display_name", None) or "").strip()
    if shop_name:
        return shop_name
    return display_name_or_none(user) or getattr(user, "username", "") or ""


def shop_avatar_url(user, request=None) -> str | None:
    """Prefer shop avatar, then account avatar."""
    shop = getattr(user, "shop_profile", None)
    avatar = getattr(shop, "avatar", None) if shop else None
    if avatar:
        try:
            return absolute_media_url(avatar.url, request) or None
        except Exception:
            pass
    return profile_avatar_url(user, request) or None
