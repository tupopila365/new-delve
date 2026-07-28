"""Public naming/avatar helpers for accounts."""

from __future__ import annotations

from .media_urls import absolute_media_url


def display_name_or_none(user) -> str | None:
    """Profile display name, or ``None`` when the user has not set one."""
    profile = getattr(user, "profile", None)
    name = (getattr(profile, "display_name", None) or "").strip()
    return name or None


def display_name_or_username(user) -> str:
    """Profile display name, falling back to the username."""
    return display_name_or_none(user) or getattr(user, "username", "") or ""


def profile_avatar_url(user, request=None) -> str | None:
    """Absolute URL of the account avatar, or ``None`` when unset/unreadable."""
    profile = getattr(user, "profile", None)
    avatar = getattr(profile, "avatar", None)
    if not avatar:
        return None
    try:
        return absolute_media_url(avatar.url, request)
    except Exception:
        return None
