"""Unit tests for voice-note upload validation."""

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from messaging.audio_validation import (
    MESSAGE_AUDIO_ALLOWED_EXTENSIONS,
    MESSAGE_AUDIO_MAX_BYTES,
    validate_message_audio_file,
)


def _audio(name: str, size: int = 1024) -> SimpleUploadedFile:
    upload = SimpleUploadedFile(name, b"x", content_type="audio/webm")
    upload.size = size
    return upload


class ValidateMessageAudioFileTests(SimpleTestCase):
    def test_none_is_allowed(self):
        self.assertIsNone(validate_message_audio_file(None))

    def test_allowed_extensions_pass(self):
        for ext in MESSAGE_AUDIO_ALLOWED_EXTENSIONS:
            self.assertIsNone(validate_message_audio_file(_audio(f"note{ext}")))

    def test_extension_check_is_case_insensitive(self):
        self.assertIsNone(validate_message_audio_file(_audio("NOTE.WEBM")))

    def test_unsupported_extension_is_rejected(self):
        with self.assertRaises(ValidationError) as ctx:
            validate_message_audio_file(_audio("note.mp3"))
        self.assertIn("Unsupported audio format", str(ctx.exception))

    def test_file_without_extension_is_allowed(self):
        self.assertIsNone(validate_message_audio_file(_audio("note")))

    def test_oversized_file_is_rejected(self):
        with self.assertRaises(ValidationError) as ctx:
            validate_message_audio_file(_audio("note.webm", size=MESSAGE_AUDIO_MAX_BYTES + 1))
        self.assertIn("10MB or smaller", str(ctx.exception))

    def test_file_at_the_size_limit_is_allowed(self):
        self.assertIsNone(validate_message_audio_file(_audio("note.webm", size=MESSAGE_AUDIO_MAX_BYTES)))

    def test_missing_size_attribute_skips_the_size_check(self):
        class _Streamed:
            name = "note.ogg"

        self.assertIsNone(validate_message_audio_file(_Streamed()))
