import re
from typing import Iterable

from django.contrib.contenttypes.models import ContentType
from django.db.models import Count
from django.utils import timezone

from social.models import Post

from communities.models import CommunityGroup

from .models import Tag, TaggedItem, TagScope

HASHTAG_RE = re.compile(r"#([\w\u00C0-\u024F]+)", re.UNICODE)

MAX_TAGS_PER_CONTENT = 5


def normalize_tag(raw: str) -> str:
    """#BestTime -> besttime (lowercase alphanumeric only)."""
    slug = (raw or "").strip().lower()
    slug = re.sub(r"[^a-z0-9]", "", slug)
    return slug[:64]


def extract_hashtags_from_text(text: str) -> list[str]:
    """Return normalized unique slugs in order of first appearance."""
    slugs: list[str] = []
    seen: set[str] = set()
    for match in HASHTAG_RE.finditer(text or ""):
        slug = normalize_tag(match.group(1))
        if not slug or slug in seen:
            continue
        seen.add(slug)
        slugs.append(slug)
    return slugs


def community_post_scope(post: Post) -> str | None:
    if post.is_accommodation_story or post.is_delvers_highlight:
        return None
    if post.is_delvers:
        return TagScope.DELVERS
    return TagScope.COMMUNITY


def sync_post_tags(post: Post) -> list[str]:
    """Index up to 5 non-blocked hashtags for a community/delvers post."""
    scope = community_post_scope(post)
    post_ct = ContentType.objects.get_for_model(Post)
    old_tag_ids = set(
        TaggedItem.objects.filter(content_type=post_ct, object_id=post.pk).values_list("tag_id", flat=True)
    )

    if not scope:
        TaggedItem.objects.filter(content_type=post_ct, object_id=post.pk).delete()
        _refresh_tag_counts(old_tag_ids)
        return []

    candidate_slugs = extract_hashtags_from_text(post.body)[:MAX_TAGS_PER_CONTENT]
    active_slugs: list[str] = []
    for slug in candidate_slugs:
        tag, _ = Tag.objects.get_or_create(slug=slug)
        if not tag.is_blocked:
            active_slugs.append(slug)

    TaggedItem.objects.filter(content_type=post_ct, object_id=post.pk).delete()

    new_tag_ids: set[int] = set()
    region = (post.region or "").strip()
    for slug in active_slugs:
        tag = Tag.objects.get(slug=slug)
        TaggedItem.objects.create(
            tag=tag,
            content_type=post_ct,
            object_id=post.pk,
            scope=scope,
            region=region,
        )
        new_tag_ids.add(tag.id)

    _refresh_tag_counts(old_tag_ids | new_tag_ids)
    return active_slugs


def _refresh_tag_counts(tag_ids: Iterable[int]) -> None:
    ids = [tid for tid in tag_ids if tid]
    if not ids:
        return
    counts = (
        TaggedItem.objects.filter(tag_id__in=ids)
        .values("tag_id")
        .annotate(c=Count("id"))
    )
    count_map = {row["tag_id"]: row["c"] for row in counts}
    now = timezone.now()
    for tag_id in ids:
        Tag.objects.filter(pk=tag_id).update(
            use_count=count_map.get(tag_id, 0),
            last_used_at=now if count_map.get(tag_id, 0) else None,
        )


def linkable_slugs_for_post(post: Post) -> list[str]:
    post_ct = ContentType.objects.get_for_model(Post)
    return list(
        TaggedItem.objects.filter(
            content_type=post_ct,
            object_id=post.pk,
            tag__is_blocked=False,
        )
        .order_by("id")
        .values_list("tag__slug", flat=True)
    )


def filter_posts_by_tag(queryset, tag_slug: str, scope: str | None = TagScope.COMMUNITY):
    slug = normalize_tag(tag_slug)
    if not slug:
        return queryset.none()
    post_ct = ContentType.objects.get_for_model(Post)
    item_qs = TaggedItem.objects.filter(
        content_type=post_ct,
        tag__slug=slug,
        tag__is_blocked=False,
    )
    if scope:
        item_qs = item_qs.filter(scope=scope)
    post_ids = item_qs.values_list("object_id", flat=True)
    return queryset.filter(id__in=post_ids)


def sync_group_tags(group: CommunityGroup, tag_slugs: list[str]) -> list[str]:
    """Attach up to MAX_TAGS_PER_CONTENT non-blocked tags to a community group."""
    group_ct = ContentType.objects.get_for_model(CommunityGroup)
    old_tag_ids = set(
        TaggedItem.objects.filter(content_type=group_ct, object_id=group.pk).values_list("tag_id", flat=True)
    )

    active_slugs: list[str] = []
    for raw in tag_slugs[:MAX_TAGS_PER_CONTENT]:
        slug = normalize_tag(raw)
        if not slug or slug in active_slugs:
            continue
        tag, _ = Tag.objects.get_or_create(slug=slug)
        if not tag.is_blocked:
            active_slugs.append(slug)

    TaggedItem.objects.filter(content_type=group_ct, object_id=group.pk).delete()

    new_tag_ids: set[int] = set()
    for slug in active_slugs:
        tag = Tag.objects.get(slug=slug)
        TaggedItem.objects.create(
            tag=tag,
            content_type=group_ct,
            object_id=group.pk,
            scope=TagScope.GROUPS,
        )
        new_tag_ids.add(tag.id)

    _refresh_tag_counts(old_tag_ids | new_tag_ids)
    return active_slugs


def linkable_slugs_for_group(group: CommunityGroup) -> list[str]:
    group_ct = ContentType.objects.get_for_model(CommunityGroup)
    return list(
        TaggedItem.objects.filter(
            content_type=group_ct,
            object_id=group.pk,
            tag__is_blocked=False,
        )
        .order_by("id")
        .values_list("tag__slug", flat=True)
    )


def prefetch_group_tag_slugs(groups: list[CommunityGroup]) -> None:
    if not groups:
        return
    group_ct = ContentType.objects.get_for_model(CommunityGroup)
    ids = [group.pk for group in groups]
    rows = (
        TaggedItem.objects.filter(
            content_type=group_ct,
            object_id__in=ids,
            tag__is_blocked=False,
        )
        .order_by("id")
        .values_list("object_id", "tag__slug")
    )
    mapping: dict[int, list[str]] = {}
    for object_id, slug in rows:
        mapping.setdefault(object_id, []).append(slug)
    for group in groups:
        group._prefetched_tag_slugs = mapping.get(group.pk, [])


def filter_groups_by_tag(queryset, tag_slug: str):
    slug = normalize_tag(tag_slug)
    if not slug:
        return queryset.none()
    group_ct = ContentType.objects.get_for_model(CommunityGroup)
    group_ids = TaggedItem.objects.filter(
        content_type=group_ct,
        tag__slug=slug,
        tag__is_blocked=False,
        scope=TagScope.GROUPS,
    ).values_list("object_id", flat=True)
    return queryset.filter(id__in=group_ids)


def group_ids_matching_tag_query(query: str) -> list[int]:
    slug = normalize_tag(query)
    if not slug:
        return []
    group_ct = ContentType.objects.get_for_model(CommunityGroup)
    return list(
        TaggedItem.objects.filter(
            content_type=group_ct,
            tag__slug__icontains=slug,
            tag__is_blocked=False,
            scope=TagScope.GROUPS,
        ).values_list("object_id", flat=True)
    )
