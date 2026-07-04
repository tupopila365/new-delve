"""Provider automated welcome and messaging settings helpers."""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.utils import timezone

from accounts.profile_access import user_is_service_provider

from .models import (
    MAX_AUTO_WELCOME_BODY,
    MAX_QUICK_REPLIES,
    MAX_QUICK_REPLY_LEN,
    Conversation,
    Message,
    ProviderMessagingSettings,
)

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

    from accounts.models import BusinessProfile


def is_service_provider(user: AbstractBaseUser) -> bool:
    return user_is_service_provider(user)


def get_or_create_provider_messaging_settings(user, business: BusinessProfile | None = None) -> ProviderMessagingSettings:
    if business is not None:
        row, _ = ProviderMessagingSettings.objects.get_or_create(
            business=business,
            defaults={"user": business.owner},
        )
        return row
    row, _ = ProviderMessagingSettings.objects.get_or_create(user=user, business=None)
    return row


def get_account_default_settings(user) -> ProviderMessagingSettings | None:
    return ProviderMessagingSettings.objects.filter(user=user, business__isnull=True).first()


def resolve_settings_for_read(access: ProviderMessagingAccess) -> tuple[ProviderMessagingSettings | None, bool]:
    """
    Return (settings_row, inherits_account_default).

    Business scope falls back to account defaults for display until a business row is saved.
    """
    if access.business is not None:
        row = ProviderMessagingSettings.objects.filter(business=access.business).first()
        if row is not None:
            return row, False
        default = get_account_default_settings(access.owner)
        if default is not None:
            return default, True
        row = get_or_create_provider_messaging_settings(access.owner, business=access.business)
        return row, False

    row = get_or_create_provider_messaging_settings(access.owner, business=None)
    return row, False


def resolve_effective_welcome_settings(
    provider,
    business: BusinessProfile | None = None,
) -> ProviderMessagingSettings | None:
    """Welcome message: business row when present, otherwise account default."""
    if business is not None:
        row = ProviderMessagingSettings.objects.filter(business=business).first()
        if row is not None:
            return row
    return get_account_default_settings(provider)


def resolve_effective_booking_confirmed_settings(
    provider,
    business: BusinessProfile | None = None,
) -> ProviderMessagingSettings | None:
    """Booking confirmed message: business row when present, otherwise account default."""
    if business is not None:
        row = ProviderMessagingSettings.objects.filter(business=business).first()
        if row is not None:
            return row
    return get_account_default_settings(provider)


def resolve_provider_business_for_owner(provider) -> BusinessProfile | None:
    from accounts.models import BusinessProfile

    businesses = list(BusinessProfile.objects.filter(owner=provider).order_by("id"))
    if len(businesses) == 1:
        return businesses[0]
    return None


def resolve_business_for_auto_welcome(provider, start_data=None) -> BusinessProfile | None:
    from accounts.models import BusinessProfile

    if not start_data:
        return None

    raw_business_id = start_data.get("business_id")
    if raw_business_id not in (None, ""):
        try:
            business_id = int(raw_business_id)
        except (TypeError, ValueError):
            business_id = None
        if business_id:
            business = BusinessProfile.objects.filter(pk=business_id, owner=provider).first()
            if business is not None:
                return business

    context_type = (start_data.get("context_type") or "").strip().lower()
    if not context_type:
        return None

    return resolve_provider_business_for_owner(provider)


def normalize_quick_replies(raw) -> list[str]:
    if not isinstance(raw, list):
        return []
    cleaned: list[str] = []
    for item in raw:
        if not isinstance(item, str):
            continue
        text = item.strip()
        if not text:
            continue
        cleaned.append(text[:MAX_QUICK_REPLY_LEN])
        if len(cleaned) >= MAX_QUICK_REPLIES:
            break
    return cleaned


def serialize_provider_messaging_settings(row: ProviderMessagingSettings) -> dict:
    return {
        "auto_welcome_enabled": row.auto_welcome_enabled,
        "auto_welcome_body": row.auto_welcome_body or "",
        "booking_confirmed_enabled": row.booking_confirmed_enabled,
        "booking_confirmed_body": row.booking_confirmed_body or "",
        "quick_replies_enabled": row.quick_replies_enabled,
        "quick_replies": normalize_quick_replies(row.quick_replies),
        "updated_at": row.updated_at,
    }


class ProviderMessagingAccess:
    """Resolved owner + optional business scope for settings read/write."""

    def __init__(self, owner, business: BusinessProfile | None, acting_user):
        self.owner = owner
        self.business = business
        self.acting_user = acting_user

    @property
    def managed_for_owner(self) -> bool:
        return self.owner.pk != self.acting_user.pk


def _parse_business_id(raw) -> int | None:
    if raw is None or raw == "":
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def resolve_provider_messaging_access(user, business_id=None):
    """
    Resolve which provider's settings the caller may read/write.

    Returns (access, error_response). error_response is a DRF Response when access is denied.
    """
    from rest_framework.response import Response

    from accounts.business_access import business_permissions
    from accounts.models import BusinessProfile

    biz_id = _parse_business_id(business_id)
    if biz_id is not None:
        business = (
            BusinessProfile.objects.select_related("owner", "owner__profile")
            .filter(pk=biz_id)
            .first()
        )
        if business is None:
            return None, Response({"detail": "Business not found."}, status=404)
        perms = business_permissions(user, business)
        if not perms.get("manage_settings"):
            return None, Response(
                {"detail": "You do not have permission to manage messaging settings for this business."},
                status=403,
            )
        owner = business.owner
        if not is_service_provider(owner):
            return None, Response(
                {"detail": "Business owner is not a service provider."},
                status=400,
            )
        return ProviderMessagingAccess(owner=owner, business=business, acting_user=user), None

    if not is_service_provider(user):
        return None, Response({"detail": "Service providers only."}, status=403)
    return ProviderMessagingAccess(owner=user, business=None, acting_user=user), None


def serialize_provider_messaging_settings_response(
    row: ProviderMessagingSettings | None,
    access: ProviderMessagingAccess,
    *,
    inherits_account_default: bool = False,
) -> dict:
    payload = serialize_provider_messaging_settings(row) if row else {
        "auto_welcome_enabled": False,
        "auto_welcome_body": "",
        "booking_confirmed_enabled": False,
        "booking_confirmed_body": "",
        "quick_replies_enabled": False,
        "quick_replies": [],
        "updated_at": None,
    }
    payload["owner_username"] = access.owner.username
    payload["managed_for_owner"] = access.managed_for_owner
    payload["inherits_account_default"] = inherits_account_default
    payload["scope"] = "business" if access.business is not None else "account"
    if access.business is not None:
        payload["business_id"] = access.business.id
        payload["business_name"] = access.business.business_name
    else:
        payload["business_id"] = None
        payload["business_name"] = None
    return payload


def provider_has_auto_welcome(user) -> bool:
    """Public hint only — true when any enabled welcome exists for this provider."""
    if not is_service_provider(user):
        return False
    rows = ProviderMessagingSettings.objects.filter(user=user)
    for row in rows:
        if row.auto_welcome_enabled and (row.auto_welcome_body or "").strip():
            return True
    return False


def validate_provider_messaging_settings(row: ProviderMessagingSettings) -> str | None:
    if row.auto_welcome_enabled and not (row.auto_welcome_body or "").strip():
        return "Welcome message is required when automated welcome is enabled."
    if row.booking_confirmed_enabled and not (row.booking_confirmed_body or "").strip():
        return "Booking confirmed message is required when booking automation is enabled."
    if row.quick_replies_enabled and not normalize_quick_replies(row.quick_replies):
        return "Add at least one quick reply shortcut or turn the feature off."
    return None


def send_provider_auto_welcome_if_needed(
    conversation: Conversation,
    initiator,
    recipient,
    *,
    start_data=None,
) -> bool:
    """Send one provider welcome message when a guest opens a new thread."""
    if not is_service_provider(recipient):
        return False
    if initiator.pk == recipient.pk:
        return False

    business = resolve_business_for_auto_welcome(recipient, start_data=start_data)
    settings_row = resolve_effective_welcome_settings(recipient, business=business)
    if settings_row is None or not settings_row.auto_welcome_enabled:
        return False

    body = (settings_row.auto_welcome_body or "").strip()
    if not body:
        return False

    if conversation.messages.exists():
        return False

    Message.objects.create(
        conversation=conversation,
        sender=recipient,
        body=body[:MAX_AUTO_WELCOME_BODY],
        is_automated=True,
    )
    Conversation.objects.filter(pk=conversation.pk).update(updated_at=timezone.now())
    return True
