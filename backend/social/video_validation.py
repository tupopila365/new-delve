import os

from django.core.exceptions import ValidationError

POST_VIDEO_MAX_BYTES = 50 * 1024 * 1024
POST_VIDEO_ALLOWED_EXTENSIONS = frozenset({".mp4", ".webm", ".mov"})
FORBIDDEN_POST_AUDIO_KEYS = frozenset({"audio", "music", "soundtrack", "sound"})


def validate_post_upload_keys(request) -> None:
    """Reject user-uploaded audio attachments on post create/update."""
    if request is None:
        return

    keys = set()
    data = getattr(request, "data", None)
    if data is not None:
        keys.update(data.keys())
    files = getattr(request, "FILES", None)
    if files is not None:
        keys.update(files.keys())

    forbidden = keys & FORBIDDEN_POST_AUDIO_KEYS
    if forbidden:
        label = ", ".join(sorted(forbidden))
        raise ValidationError(f"Audio uploads are not allowed ({label}).")


def validate_post_video_file(video) -> None:
    """Reject oversize or unsupported video uploads on post create/update."""
    if video is None:
        return

    size = getattr(video, "size", None)
    if size is not None and size > POST_VIDEO_MAX_BYTES:
        raise ValidationError(
            f"Video must be {POST_VIDEO_MAX_BYTES // (1024 * 1024)}MB or smaller."
        )

    name = getattr(video, "name", "") or ""
    ext = os.path.splitext(name)[1].lower()
    if ext and ext not in POST_VIDEO_ALLOWED_EXTENSIONS:
        raise ValidationError(
            "Unsupported video format. Use MP4, WebM, or MOV."
        )
