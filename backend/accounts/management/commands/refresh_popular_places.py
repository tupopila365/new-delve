from django.core.management.base import BaseCommand

from accounts.popular_places import TOWN_CENTRES_BY_COUNTRY, refresh_popular_places


class Command(BaseCommand):
    help = "Refresh cached Explore popular places from listing + booking density."

    def add_arguments(self, parser):
        parser.add_argument(
            "--country",
            type=str,
            default="",
            help="Optional ISO country code (e.g. NA). Default: all preset countries.",
        )

    def handle(self, *args, **options):
        country = (options.get("country") or "").strip().upper()
        if country:
            written = refresh_popular_places(country=country)
            self.stdout.write(self.style.SUCCESS(f"Wrote {written} place(s) for {country}."))
            return
        written = refresh_popular_places()
        self.stdout.write(
            self.style.SUCCESS(
                f"Wrote {written} place(s) across {len(TOWN_CENTRES_BY_COUNTRY)} countries."
            )
        )
