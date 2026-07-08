"""Helpers for delivering Cloudinary media with browser-friendly transforms.

Videos uploaded straight from a phone are often HEVC/H.265 in a .mov
container, which browsers cannot play in a <video> element. Cloudinary can
transcode on delivery: inserting ``f_auto,q_auto`` into the delivery URL makes
Cloudinary serve the best format per browser (mp4/H.264 for Safari, WebM for
Chrome), so any uploaded source plays everywhere.
"""

_VIDEO_UPLOAD_MARKER = "/video/upload/"
_VIDEO_DELIVERY_TRANSFORM = "f_auto,q_auto"


def cloudinary_video_delivery_url(url):
    """Insert a transcode-on-delivery transform into a Cloudinary video URL.

    Returns the URL unchanged if it is empty, not a Cloudinary video URL, or
    already carries the transform.
    """
    if not url or _VIDEO_UPLOAD_MARKER not in url:
        return url

    head, _, tail = url.partition(_VIDEO_UPLOAD_MARKER)
    if tail.startswith(f"{_VIDEO_DELIVERY_TRANSFORM}/"):
        return url
    return f"{head}{_VIDEO_UPLOAD_MARKER}{_VIDEO_DELIVERY_TRANSFORM}/{tail}"
