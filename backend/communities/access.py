from django.db.models import Q, QuerySet

from .models import CommunityGroup, GroupMembership, GroupVisibility, MembershipStatus


def membership_for_user(group: CommunityGroup, user) -> GroupMembership | None:
    if not user or not user.is_authenticated:
        return None
    return (
        GroupMembership.objects.filter(group=group, user=user)
        .only("id", "status", "role")
        .first()
    )


def is_active_member(group: CommunityGroup, user) -> bool:
    row = membership_for_user(group, user)
    return row is not None and row.status == MembershipStatus.ACTIVE


def is_group_admin(group: CommunityGroup, user) -> bool:
    from .models import MembershipRole

    row = membership_for_user(group, user)
    return (
        row is not None
        and row.status == MembershipStatus.ACTIVE
        and row.role == MembershipRole.ADMIN
    )


def can_read_group_messages(group: CommunityGroup, user) -> bool:
    return is_active_member(group, user)


def can_view_group(group: CommunityGroup, user) -> bool:
    if group.is_hidden:
        return is_active_member(group, user)
    if group.visibility == GroupVisibility.PUBLIC:
        return True
    return is_active_member(group, user)


def filter_groups_for_viewer(qs: QuerySet, user) -> QuerySet:
    if user and user.is_authenticated:
        member_group_ids = GroupMembership.objects.filter(
            user=user,
            status=MembershipStatus.ACTIVE,
        ).values_list("group_id", flat=True)
        return qs.filter(
            Q(is_hidden=False)
            & (Q(visibility=GroupVisibility.PUBLIC) | Q(pk__in=member_group_ids))
        )
    return qs.filter(is_hidden=False, visibility=GroupVisibility.PUBLIC)
