import os

VIDEO_EXTENSIONS = frozenset({"mp4", "webm", "mov"})
AUDIO_EXTENSIONS = frozenset({"ogg", "m4a", "wav", "aac"})
IMAGE_EXTENSIONS = frozenset(
    {
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "bmp",
        "heic",
        "heif",
        "avif",
        "tif",
        "tiff",
    }
)


def cloudinary_resource_type_for_name(name: str) -> str:
    """Return Cloudinary resource_type for a stored file name."""
    ext = _file_extension(name)
    if ext in VIDEO_EXTENSIONS or ext in AUDIO_EXTENSIONS:
        return "video"
    if ext in IMAGE_EXTENSIONS:
        return "image"
    return "raw"


def _file_extension(name: str) -> str:
    base = os.path.basename(name.replace("\\", "/"))
    if "." not in base:
        return ""
    return base.rsplit(".", 1)[-1].lower()
