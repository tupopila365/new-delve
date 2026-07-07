from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from communities.models import (
    CommunityGroup,
    GroupMembership,
    GroupMessage,
    GroupTopic,
    GroupVisibility,
    MembershipRole,
    MembershipStatus,
)
from communities.serializers import unique_group_slug

User = get_user_model()

SEED_GROUPS = [
    {
        "name": "Windhoek Weekend Crew",
        "description": "Short trips, food spots, and safety tips around the capital.",
        "topic": GroupTopic.FOOD,
        "visibility": GroupVisibility.PUBLIC,
        "welcome": "Try Joe's for breakfast before the museum.",
    },
    {
        "name": "Sossusvlei Self-Drive",
        "description": "Tyre pressure, fuel stops, and dune sunrise timing.",
        "topic": GroupTopic.FOUR_BY_FOUR,
        "visibility": GroupVisibility.PUBLIC,
        "welcome": "Gate opens at 6 — queue early in peak season.",
    },
    {
        "name": "Etosha First-Timers",
        "description": "Ask anything before your first park visit — routes, camps, sightings.",
        "topic": GroupTopic.SAFETY,
        "visibility": GroupVisibility.PUBLIC,
        "welcome": "Halali waterhole was busy at dusk yesterday.",
    },
]


class Command(BaseCommand):
    help = "Seed sample community groups for discover tab."

    def handle(self, *args, **options):
        author = User.objects.order_by("id").first()
        if not author:
            self.stderr.write("No users found — create a user first.")
            return

        created = 0
        for row in SEED_GROUPS:
            slug = unique_group_slug(row["name"])
            if CommunityGroup.objects.filter(slug=slug).exists():
                continue
            group = CommunityGroup.objects.create(
                slug=slug,
                name=row["name"],
                description=row["description"],
                topic=row["topic"],
                visibility=row["visibility"],
                created_by=author,
            )
            GroupMembership.objects.create(
                group=group,
                user=author,
                role=MembershipRole.ADMIN,
                status=MembershipStatus.ACTIVE,
            )
            msg = GroupMessage.objects.create(group=group, author=author, body=row["welcome"])
            group.last_message_at = msg.created_at
            group.save(update_fields=["last_message_at", "updated_at"])
            created += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded {created} community group(s)."))
