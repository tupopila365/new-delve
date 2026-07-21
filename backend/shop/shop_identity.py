"""Resolve public shop name + avatar (prefer ShopProfile over user profile)."""

from __future__ import annotations

from django.core.files.storage import default_storage


def _absolute_media_url(url: str, request=None) -> str:
    text = (url or "").strip()
    if not text:
        return ""
    if text.startswith(("http://", "https://")):
        return text
    if text.startswith("/") and request:
        return request.build_absolute_uri(text)
    try:
        storage_url = default_storage.url(text)
    except Exception:
        storage_url = text if text.startswith("/") else f"/media/{text.lstrip('/')}"
    if request and storage_url.startswith("/"):
        return request.build_absolute_uri(storage_url)
    return storage_url


def shop_display_name(user) -> str:
    """Public shop title — ShopProfile.display_name, then profile name, then username."""
    shop = getattr(user, "shop_profile", None)
    shop_name = (getattr(shop, "display_name", None) or "").strip()
    if shop_name:
        return shop_name
    profile = getattr(user, "profile", None)
    profile_name = (getattr(profile, "display_name", None) or "").strip()
    if profile_name:
        return profile_name
    return getattr(user, "username", "") or ""


def shop_avatar_url(user, request=None) -> str | None:
    """Prefer shop avatar, then account avatar."""
    shop = getattr(user, "shop_profile", None)
    avatar = getattr(shop, "avatar", None) if shop else None
    if avatar:
        try:
            return _absolute_media_url(avatar.url, request) or None
        except Exception:
            pass
    profile = getattr(user, "profile", None)
    avatar = getattr(profile, "avatar", None) if profile else None
    if avatar:
        try:
            return _absolute_media_url(avatar.url, request) or None
        except Exception:
            pass
    return None
