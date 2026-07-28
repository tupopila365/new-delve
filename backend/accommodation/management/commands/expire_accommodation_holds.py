from django.core.management.base import BaseCommand

from accommodation.booking_services import expire_stale_booking_holds


class Command(BaseCommand):
    help = "Release stale unpaid accommodation holds by marking them expired."

    def handle(self, *args, **options):
        expired_count = expire_stale_booking_holds()
        self.stdout.write(
            self.style.SUCCESS(
                f"Expired {expired_count} accommodation booking hold(s)."
            )
        )
