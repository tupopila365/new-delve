from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .access import is_active_member
from .models import CommunityGroup, GroupMessage, GroupMessageUserHide

DELETE_UNSEND_WINDOW = timedelta(hours=48)

VISIBLE_MESSAGE_Q = Q(is_hidden=False) | Q(is_hidden=True, deleted_at__isnull=False)


def messages_visible_to_user(*, group, user):
    qs = GroupMessage.objects.filter(group=group).filter(VISIBLE_MESSAGE_Q)
    if user and user.is_authenticated:
        qs = qs.exclude(hidden_for__user=user)
    return qs


def can_unsend_message(*, message: GroupMessage, user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if message.author_id != user.id:
        return False
    if message.is_deleted_for_everyone:
        return False
    return timezone.now() - message.created_at <= DELETE_UNSEND_WINDOW


def delete_group_message_for_me(*, message: GroupMessage, user) -> None:
    GroupMessageUserHide.objects.get_or_create(message=message, user=user)


def delete_group_message_for_everyone(*, message: GroupMessage, user) -> GroupMessage:
    if not can_unsend_message(message=message, user=user):
        raise PermissionError("You can only delete your own recent messages for everyone.")
    message.is_hidden = True
    message.deleted_at = timezone.now()
    message.deleted_by = user
    message.body = ""
    message.save(update_fields=["is_hidden", "deleted_at", "deleted_by", "body"])
    return message


def forward_group_message(*, source: GroupMessage, user, target_group: CommunityGroup) -> GroupMessage:
    if not is_active_member(target_group, user):
        raise PermissionError("Join the target group to forward messages.")
    if source.is_deleted_for_everyone:
        raise ValueError("This message was deleted.")

    with transaction.atomic():
        forwarded = GroupMessage.objects.create(
            group=target_group,
            author=user,
            body=source.body,
            image=source.image,
            video=source.video,
            audio=source.audio,
            forwarded_from=source,
        )
        CommunityGroup.objects.filter(pk=target_group.pk).update(
            last_message_at=timezone.now(),
            updated_at=timezone.now(),
        )
    return forwarded
