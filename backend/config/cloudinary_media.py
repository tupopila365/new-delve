"""Helpers for delivering Cloudinary media with browser-friendly transforms.

Videos uploaded straight from a phone are often HEVC/H.265 in a .mov
container, which browsers cannot play in a <video> element. Cloudinary can
transcode on delivery: inserting ``f_auto,q_auto`` into the delivery URL makes
Cloudinary serve the best format per browser (mp4/H.264 for Safari, WebM for
Chrome), so any uploaded source plays everywhere.
"""

_VIDEO_UPLOAD_MARKER = "/video/upload/"
_VIDEO_DELIVERY_TRANSFORM = "f_auto,q_auto"


def cloudinary_video_delivery_url(url, trim_start=None, trim_end=None):
    """Insert a transcode-on-delivery transform into a Cloudinary video URL.

    When ``trim_start``/``trim_end`` (seconds) are supplied, Cloudinary trims
    the clip on delivery via ``so_`` (start offset) and ``eo_`` (end offset) —
    no re-encoding of the stored asset. Returns the URL unchanged if it is
    empty, not a Cloudinary video URL, or already carries a transform.
    """
    if not url or _VIDEO_UPLOAD_MARKER not in url:
        return url

    head, _, tail = url.partition(_VIDEO_UPLOAD_MARKER)
    # Already transformed (idempotent).
    if tail.startswith(_VIDEO_DELIVERY_TRANSFORM) or tail.startswith("so_"):
        return url

    params = []
    if trim_start is not None and trim_start > 0:
        params.append(f"so_{float(trim_start):.2f}")
    if trim_end is not None and trim_end > 0:
        params.append(f"eo_{float(trim_end):.2f}")
    params.append(_VIDEO_DELIVERY_TRANSFORM)
    transform = ",".join(params)
    return f"{head}{_VIDEO_UPLOAD_MARKER}{transform}/{tail}"
