"""Profile visibility and relationship helpers for social features."""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.db.models import Q, QuerySet

from accounts.models import PostsVisibility, Profile

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

    from social.models import Post


def is_following(viewer: AbstractBaseUser | None, target_user: AbstractBaseUser) -> bool:
    if not viewer or not getattr(viewer, "is_authenticated", False) or not viewer.is_authenticated:
        return False
    if viewer.pk == target_user.pk:
        return False
    from social.models import Follow

    return Follow.objects.filter(follower=viewer, following=target_user).exists()


def can_view_posts(viewer: AbstractBaseUser | None, target_user: AbstractBaseUser) -> bool:
    profile: Profile = target_user.profile
    if viewer and getattr(viewer, "is_authenticated", False) and viewer.is_authenticated:
        if viewer.pk == target_user.pk:
            return True
    if profile.posts_visibility == PostsVisibility.PRIVATE:
        return False
    if profile.is_private:
        return is_following(viewer, target_user)
    return True


def can_message(viewer: AbstractBaseUser | None, target_user: AbstractBaseUser) -> bool:
    if not viewer or not getattr(viewer, "is_authenticated", False) or not viewer.is_authenticated:
        return False
    if viewer.pk == target_user.pk:
        return False
    if not bool(target_user.profile.allow_messages):
        return False
    from messaging.models import messaging_blocked_either_way

    if messaging_blocked_either_way(viewer.pk, target_user.pk):
        return False
    return True


def get_profile_relationship(viewer: AbstractBaseUser | None, target_user: AbstractBaseUser) -> dict:
    following = is_following(viewer, target_user)
    followed_by = False
    blocked_by_me = False
    blocked_me = False
    if viewer and getattr(viewer, "is_authenticated", False) and viewer.is_authenticated:
        if viewer.pk != target_user.pk:
            from social.models import Follow
            from messaging.models import MessageBlock

            followed_by = Follow.objects.filter(follower=target_user, following=viewer).exists()
            blocked_by_me = MessageBlock.objects.filter(blocker=viewer, blocked=target_user).exists()
            blocked_me = MessageBlock.objects.filter(blocker=target_user, blocked=viewer).exists()
    return {
        "is_following": following,
        "is_followed_by": followed_by,
        "can_view_posts": can_view_posts(viewer, target_user),
        "can_message": can_message(viewer, target_user),
        "blocked_by_me": blocked_by_me,
        "blocked_me": blocked_me,
    }


def filter_posts_for_viewer(queryset: QuerySet[Post], viewer: AbstractBaseUser | None) -> QuerySet[Post]:
    """Restrict a Post queryset to content the viewer is allowed to see in feeds/lists."""
    if viewer and getattr(viewer, "is_authenticated", False) and viewer.is_authenticated:
        from social.models import Follow

        following_ids = Follow.objects.filter(follower=viewer).values("following_id")
        return queryset.filter(
            Q(author=viewer)
            | (
                ~Q(author__profile__posts_visibility=PostsVisibility.PRIVATE)
                & (Q(author__profile__is_private=False) | Q(author_id__in=following_ids))
            )
        )
    return queryset.filter(
        author__profile__posts_visibility=PostsVisibility.PUBLIC,
        author__profile__is_private=False,
    )
