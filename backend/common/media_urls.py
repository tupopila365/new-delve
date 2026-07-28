"""Absolute URL helpers for stored media paths."""

from __future__ import annotations

from django.core.files.storage import default_storage

PASSTHROUGH_PREFIXES = ("http://", "https://", "data:", "blob:")


def absolute_media_url(url: str, request=None) -> str:
    """Return an absolute URL for a stored media path.

    Already-absolute, data and blob URLs are returned untouched; relative paths are
    resolved through the default storage backend and, when a request is available,
    turned into absolute URLs.
    """
    text = (url or "").strip()
    if not text:
        return ""
    if text.startswith(PASSTHROUGH_PREFIXES):
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
