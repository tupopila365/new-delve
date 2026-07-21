"""Helpers for durable media storage (Cloudinary on Heroku)."""

from __future__ import annotations

import os

from django.conf import settings


def durable_media_configured() -> bool:
    """True when uploads survive dyno restarts (Cloudinary) or local disk is OK (DEBUG)."""
    if settings.DEBUG:
        return True
    if os.environ.get("CLOUDINARY_URL", "").strip():
        return True
    backend = (
        settings.STORAGES.get("default", {}).get("BACKEND", "")
        if getattr(settings, "STORAGES", None)
        else ""
    )
    return "cloudinary" in backend.lower()


def durable_media_error_detail() -> str:
    return (
        "Document storage is not configured for production. "
        "Set CLOUDINARY_URL on the API app, then redeploy and try again."
    )
