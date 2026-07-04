from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = (
        "Send a test email to verify SMTP config. "
        "On Heroku: heroku run -a delve-api python manage.py send_test_email you@example.com"
    )

    def add_arguments(self, parser):
        parser.add_argument("email", help="Recipient address")

    def handle(self, *args, **options):
        to = (options["email"] or "").strip()
        if "@" not in to:
            raise CommandError("Provide a valid email address.")

        subject = "DELVE test email"
        message = (
            "SMTP is working for DELVE.\n\n"
            f"EMAIL_BACKEND={settings.EMAIL_BACKEND}\n"
            f"DEFAULT_FROM_EMAIL={settings.DEFAULT_FROM_EMAIL}\n"
            f"EMAIL_HOST={settings.EMAIL_HOST or '(empty)'}\n"
            f"FRONTEND_URL={settings.FRONTEND_URL}\n"
        )
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to],
                fail_silently=False,
            )
        except Exception as exc:
            raise CommandError(f"Failed to send email: {exc}") from exc

        self.stdout.write(self.style.SUCCESS(f"Sent test email to {to}"))
