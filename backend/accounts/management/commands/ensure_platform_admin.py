"""Create or update a platform admin (is_staff) for Delve Admin production access."""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Ensure a staff user exists for Delve Admin. "
        "Pass --email and --password, or set PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD. "
        "Example: heroku run -a YOUR_API python manage.py ensure_platform_admin "
        "--email you@example.com --password 'SecurePass123!'"
    )

    def add_arguments(self, parser):
        parser.add_argument("--email", default="", help="Admin login email")
        parser.add_argument("--password", default="", help="Admin password")
        parser.add_argument(
            "--username",
            default="",
            help="Username (default: derived from email local-part)",
        )

    def handle(self, *args, **options):
        import os

        email = (options["email"] or os.environ.get("PLATFORM_ADMIN_EMAIL") or "").strip().lower()
        password = (options["password"] or os.environ.get("PLATFORM_ADMIN_PASSWORD") or "").strip()
        username = (options["username"] or os.environ.get("PLATFORM_ADMIN_USERNAME") or "").strip()

        if not email or "@" not in email:
            raise CommandError("Provide --email (or PLATFORM_ADMIN_EMAIL) with a valid address.")
        if not password or len(password) < 8:
            raise CommandError("Provide --password (or PLATFORM_ADMIN_PASSWORD) with at least 8 characters.")

        if not username:
            username = email.split("@", 1)[0].replace(".", "_")[:30] or "platform_admin"

        user = User.objects.filter(email__iexact=email).first()
        created = False
        if user is None:
            # Avoid username collision
            base = username
            n = 0
            while User.objects.filter(username__iexact=username).exists():
                n += 1
                username = f"{base[:24]}_{n}"
            user = User.objects.create_user(username=username, email=email, password=password)
            created = True
        else:
            user.set_password(password)
            if not user.email:
                user.email = email

        user.is_staff = True
        user.is_active = True
        user.is_superuser = True
        user.save()

        profile = getattr(user, "profile", None)
        if profile is not None:
            profile.email_verified = True
            profile.save(update_fields=["email_verified"])

        action = "Created" if created else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} platform admin: username={user.username} email={user.email} is_staff=True"
            )
        )
        self.stdout.write("Sign in to Delve Admin with this email and password.")
