"""Transactional email helpers for verification and password reset."""
from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

from .models import EmailVerificationToken, PasswordResetToken, User

logger = logging.getLogger(__name__)

VERIFICATION_SENT_MESSAGE = "If an account exists and is unverified, we sent a verification email."
PASSWORD_RESET_SENT_MESSAGE = "If an account exists, we sent reset instructions."


def deliver_mail(*, subject: str, message: str, recipient_list: list[str]) -> bool:
    """Send email and log failures (never swallow silently without a log line)."""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception(
            "Failed to send email subject=%r to=%r backend=%s",
            subject,
            recipient_list,
            settings.EMAIL_BACKEND,
        )
        return False


def send_verification_email(user: User) -> EmailVerificationToken:
    token = EmailVerificationToken.create_for_user(user)
    frontend = settings.FRONTEND_URL.rstrip("/")
    link = f"{frontend}/verify-email?token={token.token}"
    deliver_mail(
        subject="Verify your DELVE account",
        message=(
            f"Hi {user.username},\n\n"
            f"Verify your email by opening this link:\n{link}\n\n"
            f"This link expires in 48 hours.\n\n"
            f"If the link does not work, open DELVE and paste this token on the verify page:\n"
            f"{token.token}\n"
        ),
        recipient_list=[user.email],
    )
    return token


def can_resend_verification(user: User) -> bool:
    if not user.is_active:
        return False
    if user.username.startswith("deleted_"):
        return False
    return not getattr(user.profile, "email_verified", False)


def send_password_reset_email(user: User) -> PasswordResetToken:
    token = PasswordResetToken.create_for_user(user)
    frontend = settings.FRONTEND_URL.rstrip("/")
    link = f"{frontend}/reset-password?token={token.token}"
    deliver_mail(
        subject="Reset your DELVE password",
        message=(
            f"Hi {user.username},\n\n"
            f"Reset your password by opening this link:\n{link}\n\n"
            f"This link expires in 1 hour.\n\n"
            f"If the link does not work, open DELVE and paste this token on the reset page:\n"
            f"{token.token}\n\n"
            f"If you did not request this, you can ignore this email.\n"
        ),
        recipient_list=[user.email],
    )
    return token
