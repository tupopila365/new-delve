"""Shared validation for listing gallery media (images + short videos)."""

from __future__ import annotations

GALLERY_MEDIA_MAX_ITEMS = 12


def normalize_gallery_media_item(raw) -> dict | None:
    """Accept legacy URL strings or {url, kind} objects."""
    if isinstance(raw, str):
        url = raw.strip()
        if not url:
            return None
        return {"url": url, "kind": "image"}
    if isinstance(raw, dict):
        url = str(raw.get("url") or "").strip()
        if not url:
            return None
        kind = raw.get("kind")
        if kind not in ("image", "video"):
            kind = "image"
        return {"url": url, "kind": kind}
    return None


def validate_gallery_media_list(value, *, max_items: int = GALLERY_MEDIA_MAX_ITEMS) -> list[dict]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError("Gallery must be a list.")
    cleaned: list[dict] = []
    for item in value:
        normalized = normalize_gallery_media_item(item)
        if normalized:
            cleaned.append(normalized)
    if len(cleaned) > max_items:
        raise ValueError(f"At most {max_items} gallery items.")
    return cleaned
