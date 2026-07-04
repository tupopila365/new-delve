"""Transactional email helpers for verification and password reset."""
from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

from .models import EmailVerificationToken, PasswordResetToken, User

logger = logging.getLogger(__name__)

VERIFICATION_SENT_MESSAGE = "If an account exists and is unverified, we sent a verification email."
PASSWORD_RESET_SENT_MESSAGE = "If an account exists, we sent reset instructions."

VERIFICATION_EXPIRES_HOURS = 48


def deliver_mail(
    *,
    subject: str,
    message: str,
    recipient_list: list[str],
    html_message: str | None = None,
) -> bool:
    """Send email and log failures (never swallow silently without a log line)."""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            html_message=html_message,
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
    verify_url = f"{frontend}/verify-email?token={token.token}"
    context = {
        "username": user.username,
        "verify_url": verify_url,
        "token": str(token.token),
        "expires_hours": VERIFICATION_EXPIRES_HOURS,
    }
    deliver_mail(
        subject="Verify your DELVE account",
        message=render_to_string("emails/verify_email.txt", context).strip(),
        html_message=render_to_string("emails/verify_email.html", context),
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
