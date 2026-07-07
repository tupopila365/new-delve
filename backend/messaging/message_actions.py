from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from accounts.profile_access import can_message

from .models import Conversation, Message, MessageUserHide

DELETE_UNSEND_WINDOW = timedelta(hours=48)

VISIBLE_MESSAGE_Q = Q(is_hidden=False) | Q(is_hidden=True, deleted_at__isnull=False)


def messages_visible_to_user(*, conversation, user):
    qs = Message.objects.filter(conversation=conversation).filter(VISIBLE_MESSAGE_Q)
    if user and user.is_authenticated:
        qs = qs.exclude(hidden_for__user=user)
    return qs


def can_unsend_message(*, message: Message, user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if message.sender_id != user.id:
        return False
    if message.is_deleted_for_everyone:
        return False
    return timezone.now() - message.created_at <= DELETE_UNSEND_WINDOW


def delete_message_for_me(*, message: Message, user) -> None:
    MessageUserHide.objects.get_or_create(message=message, user=user)


def delete_message_for_everyone(*, message: Message, user) -> Message:
    if not can_unsend_message(message=message, user=user):
        raise PermissionError("You can only delete your own recent messages for everyone.")
    message.is_hidden = True
    message.deleted_at = timezone.now()
    message.deleted_by = user
    message.body = ""
    message.save(update_fields=["is_hidden", "deleted_at", "deleted_by", "body"])
    return message


def forward_message(*, source: Message, user, target_conversation: Conversation) -> Message:
    if not target_conversation.participants.filter(pk=user.pk).exists():
        raise PermissionError("Join the target conversation to forward messages.")
    other = target_conversation.participants.exclude(pk=user.pk).first()
    if other and not can_message(user, other):
        raise PermissionError("You cannot message this user.")
    if source.is_deleted_for_everyone:
        raise ValueError("This message was deleted.")

    with transaction.atomic():
        forwarded = Message.objects.create(
            conversation=target_conversation,
            sender=user,
            body=source.body,
            image=source.image,
            video=source.video,
            audio=source.audio,
            forwarded_from=source,
        )
        Conversation.objects.filter(pk=target_conversation.pk).update(updated_at=timezone.now())
    return forwarded
