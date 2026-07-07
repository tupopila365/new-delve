import os

from django.core.exceptions import ValidationError

MESSAGE_IMAGE_MAX_BYTES = 12 * 1024 * 1024
MESSAGE_IMAGE_ALLOWED_EXTENSIONS = frozenset(
    {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".avif"}
)


def validate_message_image_file(image) -> None:
    if image is None:
        return

    size = getattr(image, "size", None)
    if size is not None and size > MESSAGE_IMAGE_MAX_BYTES:
        raise ValidationError(
            f"Photo must be {MESSAGE_IMAGE_MAX_BYTES // (1024 * 1024)}MB or smaller."
        )

    name = getattr(image, "name", "") or ""
    ext = os.path.splitext(name)[1].lower()
    if ext and ext not in MESSAGE_IMAGE_ALLOWED_EXTENSIONS:
        raise ValidationError("Unsupported photo format for messages.")
