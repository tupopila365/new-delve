"""Seed a handful of Namibia-area spots for local demo (idempotent)."""

from decimal import Decimal

from django.core.management.base import BaseCommand

from coin_toss.models import CommunityVote, TossLocation
from django.contrib.auth import get_user_model


SEED = [
    {
        "name": "Daan Viljoen Nature Reserve viewpoint",
        "category": "viewpoint",
        "description": "Rolling hills just west of Windhoek — golden hour views.",
        "latitude": Decimal("-22.535000"),
        "longitude": Decimal("16.978000"),
        "region": "Khomas",
        "city": "Windhoek",
        "open_source_ref": "osm:node/demo-daan-viljoen",
    },
    {
        "name": "Goreangab Dam shoreline walk",
        "category": "hike",
        "description": "Quiet waterside path popular with locals for sunset strolls.",
        "latitude": Decimal("-22.512000"),
        "longitude": Decimal("17.018000"),
        "region": "Khomas",
        "city": "Windhoek",
        "open_source_ref": "osm:way/demo-goreangab",
    },
    {
        "name": "Katutura Open Market",
        "category": "market",
        "description": "Bustling community market — food, crafts, and conversation.",
        "latitude": Decimal("-22.520500"),
        "longitude": Decimal("17.055000"),
        "region": "Khomas",
        "city": "Windhoek",
        "open_source_ref": "osm:node/demo-katutura-market",
    },
    {
        "name": "Heinitzburg Castle lookout",
        "category": "culture",
        "description": "Hilltop castle with panoramic city views.",
        "latitude": Decimal("-22.576800"),
        "longitude": Decimal("17.089500"),
        "region": "Khomas",
        "city": "Windhoek",
        "open_source_ref": "wikidata:QQdemo-heinitzburg",
    },
    {
        "name": "Auas Mountains trailhead",
        "category": "hike",
        "description": "Start of a scenic trail into the Auas range.",
        "latitude": Decimal("-22.650000"),
        "longitude": Decimal("17.150000"),
        "region": "Khomas",
        "city": "Windhoek",
        "open_source_ref": "osm:node/demo-auas",
    },
    {
        "name": "Joe's Beerhouse beer garden corner",
        "category": "cafe",
        "description": "Classic Windhoek hangout — flagged if over-promoted commercially.",
        "latitude": Decimal("-22.558000"),
        "longitude": Decimal("17.078000"),
        "region": "Khomas",
        "city": "Windhoek",
        "open_source_ref": "osm:node/demo-joes",
    },
]


class Command(BaseCommand):
    help = "Seed demo coin-toss locations near Windhoek (safe to re-run)."

    def handle(self, *args, **options):
        User = get_user_model()
        created_n = 0
        for row in SEED:
            loc, created = TossLocation.objects.get_or_create(
                name=row["name"],
                defaults=row,
            )
            if created:
                created_n += 1

            # Ensure enough organic upvotes so the toss has a pool
            voters = list(User.objects.all()[:5])
            if not voters:
                self.stdout.write(self.style.WARNING("No users yet — locations seeded without votes."))
                continue
            for i, user in enumerate(voters[:3]):
                CommunityVote.objects.get_or_create(
                    user=user,
                    location=loc,
                    defaults={
                        "voter_latitude": loc.latitude,
                        "voter_longitude": loc.longitude,
                    },
                )

        self.stdout.write(
            self.style.SUCCESS(f"Coin toss seed done. New locations: {created_n}. Total: {TossLocation.objects.count()}.")
        )
