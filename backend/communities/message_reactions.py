from collections import defaultdict

from .models import GroupMessageReaction

ALLOWED_GROUP_MESSAGE_EMOJIS = ("👍", "❤️", "😂", "😮", "😢", "🙏")


def normalize_group_message_emoji(raw: str) -> str | None:
    emoji = (raw or "").strip()
    if emoji in ALLOWED_GROUP_MESSAGE_EMOJIS:
        return emoji
    return None


def reactions_summary_for_messages(messages, user) -> dict[int, list[dict]]:
    message_ids = [message.pk for message in messages if message.pk]
    if not message_ids:
        return {}

    rows = GroupMessageReaction.objects.filter(message_id__in=message_ids).select_related("user")
    by_message: dict[int, dict[str, dict]] = defaultdict(dict)

    for row in rows:
        bucket = by_message[row.message_id].setdefault(
            row.emoji,
            {"emoji": row.emoji, "count": 0, "reacted_by_me": False},
        )
        bucket["count"] += 1
        if user and user.is_authenticated and row.user_id == user.pk:
            bucket["reacted_by_me"] = True

    return {
        message_id: list(emojis.values())
        for message_id, emojis in by_message.items()
    }


def toggle_group_message_reaction(*, message, user, emoji: str) -> list[dict]:
    normalized = normalize_group_message_emoji(emoji)
    if not normalized:
        raise ValueError("invalid emoji")

    existing = GroupMessageReaction.objects.filter(message=message, user=user).first()
    if existing and existing.emoji == normalized:
        existing.delete()
    elif existing:
        existing.emoji = normalized
        existing.save(update_fields=["emoji"])
    else:
        GroupMessageReaction.objects.create(message=message, user=user, emoji=normalized)

    rows = GroupMessageReaction.objects.filter(message=message)
    grouped: dict[str, dict] = {}
    for row in rows:
        bucket = grouped.setdefault(
            row.emoji,
            {"emoji": row.emoji, "count": 0, "reacted_by_me": False},
        )
        bucket["count"] += 1
        if row.user_id == user.pk:
            bucket["reacted_by_me"] = True
    return list(grouped.values())
