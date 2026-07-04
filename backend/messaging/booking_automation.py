"""Send automated provider messages when bookings are confirmed."""

from __future__ import annotations

from django.db import IntegrityError, transaction
from django.utils import timezone

from accounts.profile_access import can_message

from .models import (
    CONTEXT_TYPES,
    BookingAutomatedMessageLog,
    Conversation,
    MAX_AUTO_WELCOME_BODY,
    Message,
    make_pair_key,
)
from .provider_messaging import (
    is_service_provider,
    resolve_effective_booking_confirmed_settings,
    resolve_provider_business_for_owner,
)


def _get_or_create_direct_conversation(user_a, user_b) -> Conversation | None:
    pair_key = make_pair_key(user_a.pk, user_b.pk)
    existing = Conversation.objects.filter(pair_key=pair_key).first()
    if existing:
        return existing
    try:
        with transaction.atomic():
            conv = Conversation.objects.create(pair_key=pair_key)
            conv.participants.add(user_a.pk, user_b.pk)
            return conv
    except IntegrityError:
        return Conversation.objects.filter(pair_key=pair_key).first()


def notify_booking_confirmed(
    *,
    provider,
    guest,
    booking_type: str,
    booking_id: int,
    context_label: str = "",
) -> bool:
    """Post one automated confirmation message in the provider-guest thread."""
    if not provider or not guest or provider.pk == guest.pk:
        return False
    if not is_service_provider(provider):
        return False
    if not can_message(guest, provider):
        return False

    booking_type = (booking_type or "").strip().lower()
    if booking_type not in CONTEXT_TYPES:
        return False

    if BookingAutomatedMessageLog.objects.filter(
        booking_type=booking_type,
        booking_id=booking_id,
        trigger=BookingAutomatedMessageLog.TRIGGER_CONFIRMED,
    ).exists():
        return False

    business = resolve_provider_business_for_owner(provider)
    settings_row = resolve_effective_booking_confirmed_settings(provider, business=business)
    if settings_row is None or not settings_row.booking_confirmed_enabled:
        return False

    body = (settings_row.booking_confirmed_body or "").strip()
    if not body:
        return False

    with transaction.atomic():
        conv = _get_or_create_direct_conversation(provider, guest)
        if conv is None:
            return False

        label = (context_label or "").strip()[:200]
        Conversation.objects.filter(pk=conv.pk).update(
            context_type=booking_type,
            context_id=booking_id,
            context_label=label,
        )

        msg = Message.objects.create(
            conversation=conv,
            sender=provider,
            body=body[:MAX_AUTO_WELCOME_BODY],
            is_automated=True,
        )
        try:
            BookingAutomatedMessageLog.objects.create(
                booking_type=booking_type,
                booking_id=booking_id,
                trigger=BookingAutomatedMessageLog.TRIGGER_CONFIRMED,
                message=msg,
            )
        except IntegrityError:
            return False

        Conversation.objects.filter(pk=conv.pk).update(updated_at=timezone.now())
    return True
