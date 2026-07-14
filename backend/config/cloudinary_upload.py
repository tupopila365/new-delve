"""Signed Cloudinary uploads and public_id / URL allowlisting.

Direct browser → Cloudinary uploads keep large media off the Heroku dyno.
The API only stores already-uploaded public_ids on Post / PostMedia fields.
"""

from __future__ import annotations

import hashlib
import os
import re
import time
from urllib.parse import urlparse

from social.video_trim import using_cloudinary

# Folders must match Post / PostMedia upload_to paths.
IMAGE_FOLDER = "posts"
VIDEO_FOLDER = "posts/videos"

_PUBLIC_ID_SAFE = re.compile(r"^[A-Za-z0-9_./-]+$")


def cloudinary_credentials():
    """Parse CLOUDINARY_URL → (cloud_name, api_key, api_secret) or None."""
    raw = (os.environ.get("CLOUDINARY_URL") or "").strip()
    if not raw:
        return None
    # cloudinary://API_KEY:API_SECRET@CLOUD_NAME
    try:
        if "://" in raw:
            _, rest = raw.split("://", 1)
        else:
            rest = raw
        auth, cloud_name = rest.rsplit("@", 1)
        api_key, api_secret = auth.split(":", 1)
        cloud_name = cloud_name.strip().strip("/")
        if not (cloud_name and api_key and api_secret):
            return None
        return cloud_name, api_key, api_secret
    except ValueError:
        return None


def sign_upload(*, resource_type: str = "image", folder: str | None = None) -> dict:
    """Return params the browser needs for a signed Cloudinary upload.

    Raises ValueError when Cloudinary is not configured.
    """
    creds = cloudinary_credentials()
    if not creds:
        raise ValueError("Cloudinary is not configured.")

    cloud_name, api_key, api_secret = creds
    resource_type = "video" if resource_type == "video" else "image"
    if folder is None:
        folder = VIDEO_FOLDER if resource_type == "video" else IMAGE_FOLDER

    timestamp = int(time.time())
    # Sign only the params we send (alphabetically sorted), per Cloudinary docs.
    to_sign = f"folder={folder}&timestamp={timestamp}{api_secret}"
    signature = hashlib.sha1(to_sign.encode("utf-8")).hexdigest()

    return {
        "direct_upload": True,
        "cloud_name": cloud_name,
        "api_key": api_key,
        "timestamp": timestamp,
        "signature": signature,
        "folder": folder,
        "resource_type": resource_type,
        "upload_url": f"https://api.cloudinary.com/v1_1/{cloud_name}/{resource_type}/upload",
        # Client uses these for large video chunked uploads (Content-Range).
        "chunk_threshold_bytes": 10 * 1024 * 1024,
        "chunk_size_bytes": 6 * 1024 * 1024,
        "grade_delivery": _grade_delivery_flag(),
    }


def _grade_delivery_flag() -> bool:
    from config.cloudinary_media import grade_delivery_enabled

    return grade_delivery_enabled()


def _strip_extension(public_id: str) -> str:
    """Cloudinary public_ids often omit extensions; tolerate clients that include one."""
    base, ext = os.path.splitext(public_id)
    if ext.lower() in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov"}:
        return base
    return public_id


def public_id_from_cloudinary_url(url: str) -> str | None:
    """Extract the public_id from a Cloudinary delivery URL, or None if invalid."""
    if not url or not isinstance(url, str):
        return None
    url = url.strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return None

    creds = cloudinary_credentials()
    host = (parsed.hostname or "").lower()
    if "res.cloudinary.com" not in host and "cloudinary.com" not in host:
        return None
    if creds:
        cloud_name, _, _ = creds
        # Typical host: res.cloudinary.com — path starts with /<cloud_name>/...
        path = parsed.path or ""
        if f"/{cloud_name}/" not in path and not path.startswith(f"/{cloud_name}/"):
            # Also allow hosts like res-1.cloudinary.com/...
            if cloud_name not in path:
                return None

    path = parsed.path or ""
    marker = None
    for m in ("/image/upload/", "/video/upload/", "/raw/upload/"):
        if m in path:
            marker = m
            break
    if not marker:
        return None

    tail = path.split(marker, 1)[1]
    # Drop transform segments and version (v123456/) until we hit the public_id.
    parts = [p for p in tail.split("/") if p]
    while parts:
        part = parts[0]
        if part.startswith("v") and part[1:].isdigit():
            parts.pop(0)
            break
        # Transform chunk (so_1.0,eo_2.0,f_auto,q_auto) — no slash inside one segment.
        if "," in part or part.startswith(("c_", "f_", "q_", "so_", "eo_", "w_", "h_", "e_")):
            parts.pop(0)
            continue
        break
    if not parts:
        return None
    public_id = "/".join(parts)
    return _strip_extension(public_id)


def normalize_remote_media_ref(value: str | None, *, expect_video: bool = False) -> str | None:
    """Accept a public_id or Cloudinary URL; return a verified public_id or None."""
    if value is None:
        return None
    if not isinstance(value, str):
        return None
    value = value.strip()
    if not value:
        return None

    if value.startswith("http://") or value.startswith("https://"):
        public_id = public_id_from_cloudinary_url(value)
    else:
        public_id = _strip_extension(value.lstrip("/"))

    if not public_id or not _PUBLIC_ID_SAFE.match(public_id):
        return None

    # Must live under our post folders (prevents attaching arbitrary Cloudinary assets).
    if expect_video:
        if not (public_id.startswith(f"{VIDEO_FOLDER}/") or public_id.startswith("posts/videos/")):
            return None
    else:
        if public_id.startswith(f"{VIDEO_FOLDER}/"):
            return None
        if not public_id.startswith(f"{IMAGE_FOLDER}/"):
            return None

    return public_id


def attach_public_id(owner, field_name: str, public_id: str) -> None:
    """Point a FileField/ImageField at an existing Cloudinary public_id without re-upload."""
    field = getattr(owner, field_name, None)
    if field is None and not hasattr(owner, field_name):
        return
    # DB column stores the public_id string for django-cloudinary-storage.
    type(owner).objects.filter(pk=owner.pk).update(**{field_name: public_id})
    owner.refresh_from_db(fields=[field_name])


def remote_media_available() -> bool:
    return using_cloudinary() and cloudinary_credentials() is not None
