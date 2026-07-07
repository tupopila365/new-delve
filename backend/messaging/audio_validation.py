import os

from django.core.exceptions import ValidationError

MESSAGE_AUDIO_MAX_BYTES = 10 * 1024 * 1024
MESSAGE_AUDIO_ALLOWED_EXTENSIONS = frozenset({".webm", ".ogg", ".mp4", ".m4a", ".wav", ".aac"})


def validate_message_audio_file(audio) -> None:
    if audio is None:
        return

    size = getattr(audio, "size", None)
    if size is not None and size > MESSAGE_AUDIO_MAX_BYTES:
        raise ValidationError(
            f"Voice note must be {MESSAGE_AUDIO_MAX_BYTES // (1024 * 1024)}MB or smaller."
        )

    name = getattr(audio, "name", "") or ""
    ext = os.path.splitext(name)[1].lower()
    if ext and ext not in MESSAGE_AUDIO_ALLOWED_EXTENSIONS:
        raise ValidationError("Unsupported audio format for voice notes.")
