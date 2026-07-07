from django.db.models import Count, OuterRef, Q, Subquery
from django.utils import timezone

from .message_actions import VISIBLE_MESSAGE_Q
from .models import CommunityGroup, GroupMembership, GroupMessage, MembershipStatus


def read_baseline(membership: GroupMembership):
    return membership.last_read_at or membership.joined_at


def unread_count_for_membership(membership: GroupMembership, user) -> int:
    baseline = read_baseline(membership)
    if baseline is None:
        return 0
    return (
        GroupMessage.objects.filter(
            group_id=membership.group_id,
            created_at__gt=baseline,
        )
        .filter(VISIBLE_MESSAGE_Q)
        .exclude(author_id=user.pk)
        .count()
    )


def total_group_unread_for_user(user) -> int:
    if not user or not user.is_authenticated:
        return 0
    total = 0
    memberships = GroupMembership.objects.filter(user=user, status=MembershipStatus.ACTIVE).only(
        "id", "group_id", "last_read_at", "joined_at"
    )
    for row in memberships:
        total += unread_count_for_membership(row, user)
    return total


def mark_group_read(group: CommunityGroup, user) -> None:
    GroupMembership.objects.filter(
        group=group,
        user=user,
        status=MembershipStatus.ACTIVE,
    ).update(last_read_at=timezone.now())


def inbox_groups_for_user(user):
    """Joined groups annotated for the messages inbox."""
    last_msg = GroupMessage.objects.filter(group_id=OuterRef("pk")).filter(VISIBLE_MESSAGE_Q).order_by(
        "-created_at"
    )
    membership = GroupMembership.objects.filter(
        group_id=OuterRef("pk"),
        user=user,
        status=MembershipStatus.ACTIVE,
    )
    return (
        CommunityGroup.objects.filter(
            memberships__user=user,
            memberships__status=MembershipStatus.ACTIVE,
            is_hidden=False,
        )
        .annotate(
            member_count_ann=Count(
                "memberships",
                filter=Q(memberships__status=MembershipStatus.ACTIVE),
                distinct=True,
            ),
            last_message_body_ann=Subquery(last_msg.values("body")[:1]),
            last_message_sender_username_ann=Subquery(
                last_msg.values("author__username")[:1]
            ),
            last_message_created_ann=Subquery(last_msg.values("created_at")[:1]),
            last_message_has_image_ann=Subquery(last_msg.values("image")[:1]),
            last_message_has_video_ann=Subquery(last_msg.values("video")[:1]),
            membership_last_read_ann=Subquery(membership.values("last_read_at")[:1]),
            membership_joined_ann=Subquery(membership.values("joined_at")[:1]),
        )
        .distinct()
        .order_by("-last_message_at", "-created_at")
    )
