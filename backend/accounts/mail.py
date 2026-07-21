"""Transactional email helpers for verification and password reset."""
from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlparse

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

from .models import BusinessProfile, EmailVerificationToken, PasswordResetToken, User, VerificationStatus

logger = logging.getLogger(__name__)

VERIFICATION_SENT_MESSAGE = "If an account exists and is unverified, we sent a verification email."
PASSWORD_RESET_SENT_MESSAGE = "If an account exists, we sent reset instructions."

VERIFICATION_EXPIRES_HOURS = 48
PASSWORD_RESET_EXPIRES_HOURS = 1


def _is_local_frontend_url(url: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return not host or host in ("localhost", "127.0.0.1", "::1")


def resolve_frontend_url(request: Any | None = None) -> str:
    """
    Base URL for links in emails.

    Prefer FRONTEND_URL. If it still points at localhost in production, fall back
    to a trusted Origin / Referer from the SPA request so reset links are usable.
    """
    configured = (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
    if configured and not _is_local_frontend_url(configured):
        return configured

    allowed = {o.rstrip("/") for o in getattr(settings, "CORS_ALLOWED_ORIGINS", []) if o}

    def _trusted(candidate: str) -> str | None:
        base = candidate.rstrip("/")
        if base in allowed:
            return base
        return None

    if request is not None:
        origin = (getattr(request, "headers", {}) or {}).get("Origin") or request.META.get("HTTP_ORIGIN") or ""
        trusted = _trusted(origin) if origin else None
        if trusted:
            return trusted
        referer = (getattr(request, "headers", {}) or {}).get("Referer") or request.META.get("HTTP_REFERER") or ""
        if referer:
            parsed = urlparse(referer)
            if parsed.scheme and parsed.netloc:
                trusted = _trusted(f"{parsed.scheme}://{parsed.netloc}")
                if trusted:
                    return trusted

    return configured or "http://localhost:5173"


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


def send_verification_email(user: User, request: Any | None = None) -> EmailVerificationToken:
    token = EmailVerificationToken.create_for_user(user)
    frontend = resolve_frontend_url(request)
    verify_url = f"{frontend}/verify-email?token={token.token}"
    context = {
        "username": user.username,
        "verify_url": verify_url,
        "token": str(token.token),
        "expires_hours": VERIFICATION_EXPIRES_HOURS,
    }
    delivered = deliver_mail(
        subject="Verify your DELVE account",
        message=render_to_string("emails/verify_email.txt", context).strip(),
        html_message=render_to_string("emails/verify_email.html", context),
        recipient_list=[user.email],
    )
    if not delivered:
        logger.error("Verification email not delivered for user_id=%s", user.pk)
    return token


def can_resend_verification(user: User) -> bool:
    if not user.is_active:
        return False
    if user.username.startswith("deleted_"):
        return False
    return not getattr(user.profile, "email_verified", False)


def send_password_reset_email(user: User, request: Any | None = None) -> PasswordResetToken:
    token = PasswordResetToken.create_for_user(user)
    frontend = resolve_frontend_url(request)
    reset_url = f"{frontend}/reset-password?token={token.token}"
    context = {
        "username": user.username,
        "reset_url": reset_url,
        "token": str(token.token),
        "expires_hours": PASSWORD_RESET_EXPIRES_HOURS,
    }
    delivered = deliver_mail(
        subject="Reset your DELVE password",
        message=render_to_string("emails/password_reset_email.txt", context).strip(),
        html_message=render_to_string("emails/password_reset_email.html", context),
        recipient_list=[user.email],
    )
    if not delivered:
        logger.error(
            "Password reset email not delivered for user_id=%s frontend=%s",
            user.pk,
            frontend,
        )
    return token


def send_business_verification_status_email(
    business: BusinessProfile,
    *,
    request: Any | None = None,
) -> bool:
    """Notify the business owner when admin changes verification_status."""
    # Prefer a fresh owner load so email is never stale after select_related misses.
    owner = getattr(business, "owner", None)
    if owner is None and business.owner_id:
        owner = User.objects.filter(pk=business.owner_id).first()
    if not owner or not (owner.email or "").strip() or not owner.is_active:
        logger.warning(
            "Skip business verification email business_id=%s — no active owner email",
            business.pk,
        )
        return False
    if owner.username.startswith("deleted_"):
        return False

    status = business.verification_status
    if status == VerificationStatus.VERIFIED:
        headline = "Your business is verified"
        status_label = "Verified"
        body = (
            "Travellers can see your verified badge. You can publish stays, guides, "
            "and transport listings that require business verification."
        )
    elif status == VerificationStatus.REJECTED:
        headline = "Verification needs another look"
        status_label = "Rejected"
        body = (
            "Update your documents in provider settings and resubmit for review. "
            "See any notes from the review team below."
        )
    elif status == VerificationStatus.SUSPENDED:
        headline = "Business verification suspended"
        status_label = "Suspended"
        body = "Contact DELVE support if you believe this was a mistake."
    elif status == VerificationStatus.PENDING:
        headline = "Verification submitted"
        status_label = "Pending review"
        body = "Our team usually reviews submissions within 2–3 business days."
    else:
        headline = "Business verification update"
        status_label = status.replace("_", " ").title()
        body = "Sign in to DELVE to see the latest status for your business."

    frontend = resolve_frontend_url(request)
    context = {
        "username": owner.username,
        "business_name": business.business_name,
        "status_label": status_label,
        "headline": headline,
        "body": body,
        "notes": (business.verification_notes or "").strip(),
        "settings_url": f"{frontend}/provider/settings",
    }
    delivered = deliver_mail(
        subject=f"DELVE: {business.business_name} — {status_label}",
        message=render_to_string("emails/business_verification_status.txt", context).strip(),
        html_message=render_to_string("emails/business_verification_status.html", context),
        recipient_list=[owner.email.strip()],
    )
    if delivered:
        logger.info(
            "Business verification email sent business_id=%s status=%s to=%s",
            business.pk,
            status,
            owner.email,
        )
    else:
        logger.error(
            "Business verification email not delivered business_id=%s owner_id=%s",
            business.pk,
            owner.pk,
        )
    return delivered
