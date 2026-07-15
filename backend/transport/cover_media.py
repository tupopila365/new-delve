"""Helpers for transport cover image/video URLs."""

from __future__ import annotations

from common.gallery_media import media_url_kind


def absolute_media_url(url: str, request=None) -> str:
    text = (url or "").strip()
    if not text:
        return ""
    if text.startswith(("http://", "https://")):
        return text
    if text.startswith("/") and request:
        return request.build_absolute_uri(text)
    if request:
        return request.build_absolute_uri(f"/media/{text.lstrip('/')}")
    return text


def vehicle_cover_url(obj, request=None) -> str | None:
    raw = getattr(obj, "cover_image", None)
    if raw:
        url = absolute_media_url(str(raw), request)
        if url:
            return url
    gallery = obj.gallery_images or []
    if gallery:
        first = gallery[0]
        if isinstance(first, dict):
            return absolute_media_url(str(first.get("url") or first.get("image") or ""), request) or None
        return absolute_media_url(str(first), request) or None
    return None


def vehicle_cover_kind(obj) -> str:
    kind = getattr(obj, "cover_kind", None)
    if kind in ("image", "video"):
        cover = (getattr(obj, "cover_image", None) or "").strip()
        if cover:
            inferred = media_url_kind(cover)
            if kind == "image" and inferred == "video":
                return "video"
            return kind
        return kind
    cover = vehicle_cover_url(obj)
    return media_url_kind(cover or "")


def bus_cover_kind(route) -> str:
    kind = getattr(route, "cover_kind", None)
    if kind in ("image", "video"):
        cover = (getattr(route, "cover_image", None) or "").strip()
        if cover:
            inferred = media_url_kind(cover)
            if kind == "image" and inferred == "video":
                return "video"
            return kind
        return kind
    return media_url_kind(getattr(route, "cover_image", None) or "")
