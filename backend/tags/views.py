from django.contrib.contenttypes.models import ContentType
from django.db.models import Count
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from social.models import Post

from .models import Tag, TaggedItem, TagScope
from .services import normalize_tag


class TagSuggestView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        q = normalize_tag((request.query_params.get("q") or "").lstrip("#"))
        scope = (request.query_params.get("scope") or TagScope.COMMUNITY).strip()
        limit_raw = (request.query_params.get("limit") or "8").strip()
        try:
            limit = min(max(int(limit_raw), 1), 20)
        except ValueError:
            limit = 8

        qs = Tag.objects.filter(is_blocked=False)
        if q:
            qs = qs.filter(slug__startswith=q)
        if scope:
            qs = qs.filter(items__scope=scope)
        rows = (
            qs.annotate(recent_use=Count("items"))
            .order_by("-recent_use", "-use_count", "slug")
            .distinct()[:limit]
        )
        return Response([{"slug": tag.slug, "use_count": tag.use_count} for tag in rows])


class TagTrendingView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        scope = (request.query_params.get("scope") or TagScope.COMMUNITY).strip()
        limit_raw = (request.query_params.get("limit") or "10").strip()
        try:
            limit = min(max(int(limit_raw), 1), 30)
        except ValueError:
            limit = 10

        qs = Tag.objects.filter(is_blocked=False)
        if scope:
            qs = qs.filter(items__scope=scope)
        rows = (
            qs.annotate(recent_use=Count("items"))
            .order_by("-recent_use", "-last_used_at", "slug")
            .distinct()[:limit]
        )
        return Response([{"slug": tag.slug, "use_count": tag.use_count} for tag in rows])


class TagDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug: str):
        normalized = normalize_tag(slug)
        if not normalized:
            return Response({"detail": "Not found."}, status=404)
        try:
            tag = Tag.objects.get(slug=normalized, is_blocked=False)
        except Tag.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        scope = (request.query_params.get("scope") or TagScope.COMMUNITY).strip()
        post_ct = ContentType.objects.get_for_model(Post)
        item_qs = TaggedItem.objects.filter(tag=tag, content_type=post_ct)
        if scope:
            item_qs = item_qs.filter(scope=scope)
        post_count = item_qs.count()

        return Response(
            {
                "slug": tag.slug,
                "use_count": tag.use_count,
                "post_count": post_count,
                "last_used_at": tag.last_used_at,
            }
        )
