import json

from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import GroupMembership, MembershipRole, MembershipStatus

User = get_user_model()

MAX_GROUP_MEMBER_BATCH = 20


def normalize_username(value: str) -> str:
    return (value or "").strip().lstrip("@")


def parse_username_list(raw) -> list[str]:
    if raw is None or raw == "":
        return []
    if isinstance(raw, list):
        items = raw
    elif isinstance(raw, str):
        text = raw.strip()
        if not text:
            return []
        if text.startswith("["):
            try:
                parsed = json.loads(text)
                items = parsed if isinstance(parsed, list) else [text]
            except json.JSONDecodeError:
                items = [part for part in text.split(",")]
        else:
            items = [part for part in text.split(",")]
    else:
        items = [raw]

    seen: set[str] = set()
    cleaned: list[str] = []
    for item in items:
        username = normalize_username(str(item))
        if not username:
            continue
        key = username.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(username)
        if len(cleaned) >= MAX_GROUP_MEMBER_BATCH:
            break
    return cleaned


def add_users_to_group(*, group, usernames: list[str], actor) -> dict:
    """Add users as active members. Skips unknown users and existing memberships."""
    added: list[str] = []
    skipped: list[str] = []

    for username in parse_username_list(usernames):
        user = User.objects.filter(username__iexact=username).first()
        if user is None:
            skipped.append(username)
            continue
        if user.pk == actor.pk:
            skipped.append(username)
            continue
        existing = GroupMembership.objects.filter(group=group, user=user).first()
        if existing:
            if existing.status != MembershipStatus.ACTIVE:
                existing.status = MembershipStatus.ACTIVE
                existing.role = MembershipRole.MEMBER
                existing.joined_at = timezone.now()
                existing.last_read_at = timezone.now()
                existing.save(update_fields=["status", "role", "joined_at", "last_read_at"])
                added.append(user.username)
            else:
                skipped.append(username)
            continue
        GroupMembership.objects.create(
            group=group,
            user=user,
            role=MembershipRole.MEMBER,
            status=MembershipStatus.ACTIVE,
            last_read_at=timezone.now(),
        )
        added.append(user.username)

    return {"added": added, "skipped": skipped}
