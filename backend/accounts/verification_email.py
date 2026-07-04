"""Backward-compatible imports — prefer accounts.mail."""
from .mail import (  # noqa: F401
    VERIFICATION_SENT_MESSAGE,
    can_resend_verification,
    send_verification_email,
)
