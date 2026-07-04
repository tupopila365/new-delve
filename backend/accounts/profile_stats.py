"""Aggregated profile counters — shared by public profile and admin views."""

from __future__ import annotations

from django.db.models import Count, Q

from social.models import Follow, Post

_MEDIA_Q = Q(image__isnull=False) | Q(video__isnull=False)


def compute_profile_stats(user) -> dict:
    post_stats = Post.objects.filter(author=user, is_hidden=False).aggregate(
        posts_count=Count("id"),
        photos_count=Count("id", filter=_MEDIA_Q),
    )
    follow_stats = Follow.objects.aggregate(
        followers_count=Count("id", filter=Q(following=user)),
        following_count=Count("id", filter=Q(follower=user)),
    )
    return {
        "posts_count": post_stats["posts_count"],
        "photos_count": post_stats["photos_count"],
        "followers_count": follow_stats["followers_count"],
        "following_count": follow_stats["following_count"],
    }
