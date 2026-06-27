"""Event ownership and team access helpers."""

from __future__ import annotations

from typing import TYPE_CHECKING

from accounts.business_access import business_permissions, provider_listing_owner_ids, user_can_manage_listing
from accounts.models import BusinessProfile

if TYPE_CHECKING:
    from .models import Event


def primary_event_business(user) -> BusinessProfile | None:
    """Best-effort business to attach when creating an event."""
    businesses = BusinessProfile.objects.filter(owner=user).order_by("-created_at")
    for biz in businesses:
        types = biz.business_types or []
        if "event_organiser" in types or "multi_provider" in types:
            return biz
    return businesses.first()


def user_can_manage_event(user, event: Event) -> bool:
    if event.organizer_id == user.id:
        return True
    if event.business_id:
        perms = business_permissions(user, event.business)
        if perms.get("manage_listings"):
            return True
    return user_can_manage_listing(user, event.organizer_id)


def user_can_manage_event_template(user, template) -> bool:
    if template.organizer_id == user.id:
        return True
    if template.business_id:
        perms = business_permissions(user, template.business)
        if perms.get("manage_listings"):
            return True
    return user_can_manage_listing(user, template.organizer_id)


def manageable_organizer_ids(user) -> set[int]:
    return provider_listing_owner_ids(user)
