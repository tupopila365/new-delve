import os

from django.core.mail import send_mail

from .models import EmailVerificationToken, User

VERIFICATION_SENT_MESSAGE = "If an account exists and is unverified, we sent a verification email."


def send_verification_email(user: User) -> EmailVerificationToken:
    token = EmailVerificationToken.create_for_user(user)
    frontend = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    link = f"{frontend}/verify-email?token={token.token}"
    send_mail(
        subject="Verify your DELVE account",
        message=(
            f"Hi {user.username},\n\n"
            f"Verify your email: {link}\n\n"
            f"This link expires in 48 hours.\n\n"
            f"Token: {token.token}"
        ),
        from_email=None,
        recipient_list=[user.email],
        fail_silently=True,
    )
    return token


def can_resend_verification(user: User) -> bool:
    if not user.is_active:
        return False
    if user.username.startswith("deleted_"):
        return False
    return not getattr(user.profile, "email_verified", False)
