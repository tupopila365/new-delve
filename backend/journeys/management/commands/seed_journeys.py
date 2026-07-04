from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from journeys.models import CostCategory, Journey, JourneyCostLine, JourneyEntry, JourneyStop

User = get_user_model()

SAMPLE = {
    "title": "Windhoek → Sossusvlei → Swakopmund",
    "summary": (
        "A classic Namibian loop — city start, the red dunes of Sossusvlei, "
        "then coast life in Swakop. Six days, one rented 4×4."
    ),
    "cover_image": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=70",
    "starts_on": "2026-03-10",
    "ends_on": "2026-03-15",
    "days": 6,
    "countries": ["NA"],
    "transport_modes": ["car"],
    "party": "couple",
    "tags": ["4x4", "dunes", "coast", "photography"],
    "total_cost": "8400.00",
    "currency": "NAD",
}


class Command(BaseCommand):
    help = "Seed sample public journeys for development."

    def handle(self, *args, **options):
        if Journey.objects.exists():
            self.stdout.write("Journeys already exist — skipping seed.")
            return

        author, _ = User.objects.get_or_create(
            username="kaoko_explorer",
            defaults={"email": "kaoko_explorer@demo.local"},
        )
        if not author.password:
            author.set_password("pass12345")
            author.save(update_fields=["password"])

        journey = Journey.objects.create(author=author, **SAMPLE)

        stops = [
            {
                "order": 0,
                "place_name": "Windhoek",
                "region": "Khomas",
                "country_code": "NA",
                "arrived_on": "2026-03-10",
                "left_on": "2026-03-11",
                "notes": "Picked up the 4×4 in the morning.",
                "cost": "1200.00",
                "entries": [
                    {
                        "body": "First night in Windhoek — Joe's Beerhouse for dinner.",
                        "image": "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=70",
                        "video": "",
                    },
                ],
            },
            {
                "order": 1,
                "place_name": "Sossusvlei",
                "region": "Hardap",
                "country_code": "NA",
                "arrived_on": "2026-03-12",
                "left_on": "2026-03-13",
                "notes": "Dune 45 at sunrise.",
                "cost": "2800.00",
                "entries": [
                    {
                        "body": "Dune 45 at first light.",
                        "image": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=70",
                        "video": "",
                    },
                ],
            },
            {
                "order": 2,
                "place_name": "Swakopmund",
                "region": "Erongo",
                "country_code": "NA",
                "arrived_on": "2026-03-13",
                "left_on": "2026-03-15",
                "notes": "Coastal vibes after the desert.",
                "cost": "2800.00",
                "entries": [],
            },
        ]

        for stop_data in stops:
            entries = stop_data.pop("entries")
            stop = JourneyStop.objects.create(journey=journey, **stop_data)
            for entry_data in entries:
                JourneyEntry.objects.create(stop=stop, **entry_data)

        for category, amount, note in [
            (CostCategory.TRANSPORT, "2100.00", "Car rental + fuel"),
            (CostCategory.STAY, "3200.00", "Camps and guesthouse"),
            (CostCategory.FOOD, "1800.00", "Meals"),
            (CostCategory.ACTIVITY, "900.00", "Park entry"),
            (CostCategory.OTHER, "400.00", "Supplies"),
        ]:
            JourneyCostLine.objects.create(
                journey=journey, category=category, amount=amount, note=note
            )

        self.stdout.write(self.style.SUCCESS(f"Seeded journey #{journey.pk} for @{author.username}"))
