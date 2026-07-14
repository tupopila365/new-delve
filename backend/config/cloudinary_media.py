"""Helpers for delivering Cloudinary media with browser-friendly transforms.

Videos uploaded straight from a phone are often HEVC/H.265 in a .mov
container, which browsers cannot play in a <video> element. Cloudinary can
transcode on delivery: inserting ``f_auto,q_auto`` into the delivery URL makes
Cloudinary serve the best format per browser (mp4/H.264 for Safari, WebM for
Chrome), so any uploaded source plays everywhere.

When ``DELVERS_CLOUDINARY_GRADE_DELIVERY`` is enabled, approximate colour
grades can also be applied on delivery (``e_brightness`` / ``e_saturation`` /
etc.) so grade-only posts skip server ffmpeg bake. Overlays still require bake.
"""

from __future__ import annotations

import os

_VIDEO_UPLOAD_MARKER = "/video/upload/"
_VIDEO_DELIVERY_TRANSFORM = "f_auto,q_auto"


def absolute_media_url(request, url: str | None) -> str | None:
    """Return a browser-usable absolute media URL without mangling CDN links.

    ``request.build_absolute_uri`` is only for relative paths (e.g. ``/media/...``).
    Cloudinary already returns ``https://res.cloudinary.com/...``; wrapping those
    again can break delivery depending on Django/host headers.
    """
    if not url:
        return None
    if url.startswith(("http://", "https://", "//")):
        return url
    if request is not None:
        return request.build_absolute_uri(url)
    return url


def grade_delivery_enabled() -> bool:
    """Feature flag: apply approximate colour grade via Cloudinary URL transforms."""
    raw = (os.environ.get("DELVERS_CLOUDINARY_GRADE_DELIVERY") or "").strip().lower()
    return raw in {"1", "true", "yes", "on"}


def _css_mul_to_cloudinary_amount(value, neutral=1.0, scale=50.0) -> int | None:
    """Map CSS-style multiplicative adjustment (1.0 = neutral) to Cloudinary ±amount."""
    if value is None:
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    delta = (v - neutral) * scale
    if abs(delta) < 1.0:
        return None
    return int(max(-99, min(100, round(delta))))


def build_grade_transform_parts(grade) -> list[str]:
    """Translate stored ``edit_grade`` JSON into Cloudinary effect transform parts.

    Approximate — matches the live CSS preview closely enough for a fast path,
    not bit-exact with the ffmpeg bake.
    """
    if not grade or not isinstance(grade, dict):
        return []

    parts: list[str] = []
    brightness = _css_mul_to_cloudinary_amount(grade.get("brightness"), 1.0, 50.0)
    if brightness is not None:
        parts.append(f"e_brightness:{brightness}")

    contrast = _css_mul_to_cloudinary_amount(grade.get("contrast"), 1.0, 40.0)
    if contrast is not None:
        parts.append(f"e_contrast:{contrast}")

    saturation = _css_mul_to_cloudinary_amount(grade.get("saturation"), 1.0, 50.0)
    if saturation is not None:
        parts.append(f"e_saturation:{saturation}")

    try:
        hue = float(grade.get("hue") or 0.0)
    except (TypeError, ValueError):
        hue = 0.0
    if abs(hue) > 0.5:
        parts.append(f"e_hue:{int(round(hue))}")

    try:
        grayscale = float(grade.get("grayscale") or 0.0)
    except (TypeError, ValueError):
        grayscale = 0.0
    if grayscale > 0.5:
        parts.append("e_grayscale")

    try:
        sepia = float(grade.get("sepia") or 0.0)
    except (TypeError, ValueError):
        sepia = 0.0
    if sepia > 0.05:
        parts.append(f"e_sepia:{int(max(1, min(100, round(sepia * 100))))}")

    try:
        sharpen = float(grade.get("sharpen") or 0.0)
    except (TypeError, ValueError):
        sharpen = 0.0
    if sharpen > 0.05:
        parts.append(f"e_sharpen:{int(max(1, min(400, round(sharpen * 200))))}")

    return parts


def cloudinary_video_delivery_url(url, trim_start=None, trim_end=None, grade=None):
    """Insert a transcode-on-delivery transform into a Cloudinary video URL.

    When ``trim_start``/``trim_end`` (seconds) are supplied, Cloudinary trims
    the clip on delivery via ``so_`` (start offset) and ``eo_`` (end offset) —
    no re-encoding of the stored asset.

    When ``grade`` is supplied (and grade delivery is enabled), approximate
    colour effects are added as ``e_*`` transforms.

    Returns the URL unchanged if it is empty or not a Cloudinary video URL.
    """
    if not url or _VIDEO_UPLOAD_MARKER not in url:
        return url

    head, _, tail = url.partition(_VIDEO_UPLOAD_MARKER)

    grade_parts: list[str] = []
    if grade_delivery_enabled() and grade:
        grade_parts = build_grade_transform_parts(grade)

    # Idempotent: already has start-offset trim and no extra grade to merge.
    first_segment = tail.split("/", 1)[0]
    if (tail.startswith("so_") or ",so_" in first_segment) and not grade_parts:
        return url

    params: list[str] = []
    if trim_start is not None and trim_start > 0:
        params.append(f"so_{float(trim_start):.2f}")
    if trim_end is not None and trim_end > 0:
        params.append(f"eo_{float(trim_end):.2f}")
    params.extend(grade_parts)

    first_segment, sep, rest = tail.partition("/")

    # Strip existing e_* / so_ / eo_ / f_auto,q_auto so we can rebuild cleanly
    # when grade parts are present; otherwise keep prior merge behaviour.
    existing_parts = [p for p in first_segment.split(",") if p]
    has_delivery = _VIDEO_DELIVERY_TRANSFORM in existing_parts or first_segment == _VIDEO_DELIVERY_TRANSFORM

    if not params and has_delivery:
        return url

    if grade_parts:
        # Rebuild transform: trim + grade + f_auto,q_auto (drop prior e_ / so_ / eo_).
        kept = [
            p
            for p in existing_parts
            if p
            and not p.startswith(("so_", "eo_", "e_"))
            and p != _VIDEO_DELIVERY_TRANSFORM
        ]
        transform_parts = params + kept
        if _VIDEO_DELIVERY_TRANSFORM not in transform_parts:
            transform_parts.append(_VIDEO_DELIVERY_TRANSFORM)
        transform = ",".join(transform_parts)
        return (
            f"{head}{_VIDEO_UPLOAD_MARKER}{transform}/{rest}"
            if sep
            else f"{head}{_VIDEO_UPLOAD_MARKER}{transform}"
        )

    if has_delivery or first_segment.startswith(f"{_VIDEO_DELIVERY_TRANSFORM},") or (
        _VIDEO_DELIVERY_TRANSFORM in first_segment.split(",")
    ):
        if not params:
            return url
        transform = ",".join(params + [first_segment])
        return f"{head}{_VIDEO_UPLOAD_MARKER}{transform}/{rest}" if sep else f"{head}{_VIDEO_UPLOAD_MARKER}{transform}"

    params.append(_VIDEO_DELIVERY_TRANSFORM)
    transform = ",".join(params)
    return f"{head}{_VIDEO_UPLOAD_MARKER}{transform}/{tail}"
