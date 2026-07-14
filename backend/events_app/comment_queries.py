"""Shared queryset helpers for threaded event comments (journey/social shape)."""

from __future__ import annotations

from django.db.models import Count, Q

from .models import EventQuestion


def event_comment_queryset(event, user=None, *, parent_id=None):
    viewer = user if user and getattr(user, "is_authenticated", False) else None
    qs = (
        EventQuestion.objects.filter(event=event, is_hidden=False)
        .select_related("author", "author__profile", "event", "event__organizer", "parent")
        .annotate(
            helpful_count=Count("helpful_votes", distinct=True),
            replies_count=Count("replies", filter=Q(replies__is_hidden=False), distinct=True),
        )
    )
    if viewer:
        qs = qs.annotate(
            marked_helpful_by_me=Count(
                "helpful_votes",
                filter=Q(helpful_votes__user=viewer),
                distinct=True,
            )
        )
    if parent_id is None:
        qs = qs.filter(parent__isnull=True)
    else:
        qs = qs.filter(parent_id=parent_id)
    return qs.order_by("created_at")


def recount_event_comments(event) -> int:
    count = EventQuestion.objects.filter(
        event=event,
        is_hidden=False,
        parent__isnull=True,
    ).count()
    event.comments_count = count
    event.save(update_fields=["comments_count"])
    return count
