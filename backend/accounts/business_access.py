"""Business team roles and permission helpers."""

from __future__ import annotations

from typing import TYPE_CHECKING

from .models import BusinessMembership, BusinessProfile, BusinessTeamRole

if TYPE_CHECKING:
    from .models import User

ROLE_RANK: dict[str, int] = {
    BusinessTeamRole.VIEWER: 1,
    BusinessTeamRole.STAFF: 2,
    BusinessTeamRole.MANAGER: 3,
    BusinessTeamRole.OWNER: 4,
}


def _rank(role: str | None) -> int:
    if not role:
        return 0
    return ROLE_RANK.get(role, 0)


def user_business_role(user: User, business: BusinessProfile) -> str | None:
    if business.owner_id == user.id:
        return BusinessTeamRole.OWNER
    membership = (
        BusinessMembership.objects.filter(business=business, user=user)
        .values_list("role", flat=True)
        .first()
    )
    return membership


def business_permissions(user: User, business: BusinessProfile) -> dict[str, bool]:
    role = user_business_role(user, business)
    rank = _rank(role)
    return {
        "role": role,
        "view_dashboard": rank >= ROLE_RANK[BusinessTeamRole.VIEWER],
        "manage_bookings": rank >= ROLE_RANK[BusinessTeamRole.STAFF],
        "manage_listings": rank >= ROLE_RANK[BusinessTeamRole.MANAGER],
        "manage_team": role == BusinessTeamRole.OWNER,
        "manage_payouts": role == BusinessTeamRole.OWNER,
        "manage_settings": rank >= ROLE_RANK[BusinessTeamRole.MANAGER],
    }


def user_can_manage_listing(user: User, listing_owner_id: int) -> bool:
    if user.id == listing_owner_id:
        return True
    businesses = BusinessProfile.objects.filter(owner_id=listing_owner_id)
    for biz in businesses:
        if _rank(user_business_role(user, biz)) >= ROLE_RANK[BusinessTeamRole.MANAGER]:
            return True
    return False


def user_can_manage_booking_for_listing(user: User, listing_owner_id: int) -> bool:
    if user.id == listing_owner_id:
        return True
    businesses = BusinessProfile.objects.filter(owner_id=listing_owner_id)
    for biz in businesses:
        if _rank(user_business_role(user, biz)) >= ROLE_RANK[BusinessTeamRole.STAFF]:
            return True
    return False


def provider_listing_owner_ids(user: User) -> set[int]:
    """User IDs whose listings this user may access in the provider dashboard."""
    ids = {user.id}
    member_owner_ids = BusinessProfile.objects.filter(
        memberships__user=user,
    ).values_list("owner_id", flat=True)
    ids.update(member_owner_ids)
    return ids
