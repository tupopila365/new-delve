from decimal import Decimal, InvalidOperation
from functools import reduce
import operator

from django.contrib.auth import get_user_model
from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from social.models import Post, PostKind
from social.serializers import PostSerializer

from .comment_queries import journey_comment_queryset, recount_journey_comments
from .models import (
    Journey,
    JourneyEntry,
    JourneyLike,
    JourneyQuestion,
    JourneyQuestionHelpful,
    JourneySave,
    JourneyStop,
    JourneyVisibility,
)
from .qa_serializers import (
    JourneyAnswerCreateSerializer,
    JourneyAnswerSerializer,
    JourneyCommentSerializer,
    JourneyQuestionCreateSerializer,
)
from .serializers import (
    JourneyListSerializer,
    JourneySearchSerializer,
    JourneySerializer,
    annotate_journey_engagement,
    can_view_journey,
    filter_journeys_for_viewer,
)

User = get_user_model()


def _journey_queryset():
    return Journey.objects.select_related("author", "author__profile").prefetch_related(
        Prefetch("stops", queryset=JourneyStop.objects.prefetch_related("entries").order_by("order", "id")),
        "costs",
    )


_MODE_TAGS = {
    "nature": ["wildlife", "hiking", "dunes", "etosha"],
    "coast": ["coast", "kayaking"],
    "culture": ["first-timer", "culture"],
    "food": ["food"],
    "adventure": ["4x4", "hiking", "kayaking", "cross-border", "dunes"],
    "family": ["family"],
}


def _tag_match_q(tag: str) -> Q:
    """Portable tag match for JSON list fields (SQLite + Postgres)."""
    token = (tag or "").strip().lower()
    if not token:
        return Q()
    # Match the quoted tag token inside the JSON array payload.
    return Q(tags__icontains=f'"{token}"')


def _tags_contain_any(tags: list[str]) -> Q:
    clauses = [_tag_match_q(tag) for tag in tags if tag]
    if not clauses:
        return Q()
    return reduce(operator.or_, clauses)


def _apply_journey_feed_filters(qs, request):
    """Search / mode / budget / saved / sort for the social journeys feed."""
    params = request.query_params

    q = (params.get("q") or "").strip()
    if q:
        qs = qs.filter(
            Q(title__icontains=q)
            | Q(summary__icontains=q)
            | Q(stops__place_name__icontains=q)
            | Q(stops__region__icontains=q)
            | Q(author__username__icontains=q)
            | Q(author__profile__display_name__icontains=q)
        ).distinct()

    mode = (params.get("mode") or "").strip().lower()
    if mode == "weekend":
        qs = qs.filter(Q(days__lte=4) | _tag_match_q("weekend"))
    elif mode == "budget":
        qs = qs.filter(Q(total_cost__lt=Decimal("5000")) | _tag_match_q("budget"))
    elif mode == "family":
        qs = qs.filter(Q(party__iexact="family") | _tag_match_q("family"))
    elif mode in _MODE_TAGS:
        qs = qs.filter(_tags_contain_any(_MODE_TAGS[mode]))

    tag = (params.get("tag") or "").strip().lower()
    if tag:
        qs = qs.filter(_tag_match_q(tag))

    min_raw = (params.get("min_cost") or "").strip()
    max_raw = (params.get("max_cost") or "").strip()
    if min_raw:
        try:
            qs = qs.filter(total_cost__gte=Decimal(min_raw))
        except (InvalidOperation, ValueError):
            pass
    if max_raw:
        try:
            qs = qs.filter(total_cost__lt=Decimal(max_raw))
        except (InvalidOperation, ValueError):
            pass

    saved_raw = (params.get("saved") or "").strip().lower()
    if saved_raw in ("1", "true", "yes"):
        if request.user.is_authenticated:
            qs = qs.filter(saves__user=request.user).distinct()
        else:
            qs = qs.none()

    sort = (params.get("sort") or "recent").strip().lower()
    if sort == "popular":
        return qs.order_by("-likes_count", "-saves_count", "-created_at", "-id")
    return qs.order_by("-created_at", "-id")


def _comment_list_payload(request, qs):
    limit_raw = request.query_params.get("limit")
    if limit_raw is None:
        rows = list(qs[:50])
        return Response(JourneyCommentSerializer(rows, many=True, context={"request": request}).data)
    try:
        limit = max(1, min(int(limit_raw), 50))
        offset = max(0, int(request.query_params.get("offset", 0)))
    except (TypeError, ValueError):
        limit, offset = 20, 0
    total = qs.count()
    rows = list(qs[offset : offset + limit])
    next_offset = offset + limit if offset + limit < total else None
    return Response(
        {
            "count": total,
            "results": JourneyCommentSerializer(rows, many=True, context={"request": request}).data,
            "next_offset": next_offset,
        }
    )


class JourneyViewSet(viewsets.ModelViewSet):
    serializer_class = JourneySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = annotate_journey_engagement(_journey_queryset(), self.request.user)
        author = (self.request.query_params.get("author") or "").strip()
        if author:
            author_user = get_object_or_404(User.objects.select_related("profile"), username__iexact=author)
            qs = qs.filter(author=author_user)
            viewer = self.request.user if self.request.user.is_authenticated else None
            if not viewer or viewer.pk != author_user.pk:
                qs = filter_journeys_for_viewer(qs, viewer)
            return qs.order_by("-created_at")

        if self.action in ("update", "partial_update", "destroy"):
            if not self.request.user.is_authenticated:
                return Journey.objects.none()
            return qs.filter(author=self.request.user)

        qs = filter_journeys_for_viewer(qs, self.request.user if self.request.user.is_authenticated else None)
        if self.action == "list":
            qs = _apply_journey_feed_filters(qs, self.request)
        else:
            qs = qs.order_by("-created_at", "-id")

        limit_raw = (self.request.query_params.get("limit") or "").strip()
        if limit_raw:
            try:
                limit = min(max(int(limit_raw), 1), 50)
                return qs[:limit]
            except ValueError:
                pass
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return JourneyListSerializer
        return JourneySerializer

    def get_permissions(self):
        if self.action in (
            "create",
            "update",
            "partial_update",
            "destroy",
            "like",
            "save",
            "questions",
            "comments",
        ):
            if self.action in ("questions", "comments") and self.request.method == "GET":
                return [permissions.AllowAny()]
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def retrieve(self, request, *args, **kwargs):
        journey = self.get_object()
        if not can_view_journey(request.user if request.user.is_authenticated else None, journey):
            raise NotFound()
        return super().retrieve(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(visibility=JourneyVisibility.PUBLIC)

    def perform_update(self, serializer):
        if serializer.instance.author_id != self.request.user.id:
            raise PermissionDenied()
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author_id != self.request.user.id:
            raise PermissionDenied()
        instance.delete()

    @action(detail=True, methods=["post"])
    def like(self, request, pk=None):
        journey = self.get_object()
        if not can_view_journey(request.user, journey):
            raise NotFound()
        like, created = JourneyLike.objects.get_or_create(journey=journey, user=request.user)
        if not created:
            like.delete()
            liked = False
        else:
            liked = True
        likes_count = JourneyLike.objects.filter(journey=journey).count()
        return Response({"liked": liked, "likes_count": likes_count})

    @action(detail=True, methods=["post"])
    def save(self, request, pk=None):
        journey = self.get_object()
        if not can_view_journey(request.user, journey):
            raise NotFound()
        save_row, created = JourneySave.objects.get_or_create(journey=journey, user=request.user)
        if not created:
            save_row.delete()
            saved = False
        else:
            saved = True
        saves_count = JourneySave.objects.filter(journey=journey).count()
        return Response({"saved": saved, "saves_count": saves_count})

    @action(detail=True, methods=["get"])
    def similar(self, request, pk=None):
        journey = self.get_object()
        if not can_view_journey(request.user if request.user.is_authenticated else None, journey):
            raise NotFound()
        viewer = request.user if request.user.is_authenticated else None
        base = filter_journeys_for_viewer(
            annotate_journey_engagement(_journey_queryset(), viewer),
            viewer,
        ).exclude(pk=journey.pk).order_by("-created_at")[:50]
        journey_countries = set(journey.countries or [])
        journey_tags = set(journey.tags or [])
        scored: list[tuple[int, Journey]] = []
        for row in base:
            score = len(journey_countries & set(row.countries or [])) + len(
                journey_tags & set(row.tags or [])
            )
            if score > 0:
                scored.append((score, row))
        scored.sort(key=lambda item: (-item[0], -item[1].pk))
        rows = [row for _, row in scored[:3]]
        return Response(JourneyListSerializer(rows, many=True, context={"request": request}).data)

    @action(detail=True, methods=["get", "post"])
    def comments(self, request, pk=None):
        """Threaded comments — same API design as /api/social/posts/{id}/comments/."""
        journey = self.get_object()
        viewer = request.user if request.user.is_authenticated else None
        if not can_view_journey(viewer, journey):
            raise NotFound()
        if request.method == "GET":
            parent_param = request.query_params.get("parent")
            parent_id = None
            if parent_param not in (None, "", "root"):
                try:
                    parent_id = int(parent_param)
                except (TypeError, ValueError):
                    return Response({"detail": "Invalid parent id."}, status=status.HTTP_400_BAD_REQUEST)
                if not JourneyQuestion.objects.filter(
                    pk=parent_id, journey=journey, is_hidden=False
                ).exists():
                    raise NotFound()
            qs = journey_comment_queryset(journey, request.user, parent_id=parent_id)
            return _comment_list_payload(request, qs)

        ser = JourneyQuestionCreateSerializer(
            data=request.data,
            context={"request": request, "journey": journey},
        )
        ser.is_valid(raise_exception=True)
        comment = ser.save()
        if comment.parent_id is None:
            recount_journey_comments(journey)
        annotated = journey_comment_queryset(
            journey,
            request.user,
            parent_id=comment.parent_id,
        ).filter(pk=comment.pk).first()
        return Response(
            JourneyCommentSerializer(annotated or comment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"])
    def questions(self, request, pk=None):
        """Back-compat alias for comments (roots on GET; create root/reply on POST)."""
        return self.comments(request, pk=pk)


class JourneyQuestionAnswerView(APIView):
    """Back-compat: POST a reply as a nested comment (parent = question id)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        question = (
            JourneyQuestion.objects.select_related("journey", "journey__author")
            .filter(pk=pk, is_hidden=False)
            .first()
        )
        if not question:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        viewer = request.user
        if not can_view_journey(viewer, question.journey):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = JourneyAnswerCreateSerializer(
            data=request.data,
            context={"request": request, "question": question},
        )
        ser.is_valid(raise_exception=True)
        reply = ser.save()
        annotated = journey_comment_queryset(
            question.journey,
            request.user,
            parent_id=question.pk,
        ).filter(pk=reply.pk).first()
        return Response(
            JourneyAnswerSerializer(annotated or reply, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class JourneyCommentHelpfulView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        comment = (
            JourneyQuestion.objects.select_related("journey")
            .filter(pk=pk, is_hidden=False)
            .first()
        )
        if not comment:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if not can_view_journey(request.user, comment.journey):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        row, created = JourneyQuestionHelpful.objects.get_or_create(
            question=comment, user=request.user
        )
        if not created:
            row.delete()
            marked = False
        else:
            marked = True
        helpful_count = JourneyQuestionHelpful.objects.filter(question=comment).count()
        return Response({"marked_helpful": marked, "helpful_count": helpful_count})


class JourneyEntryShareView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        entry = (
            JourneyEntry.objects.select_related("stop", "stop__journey", "stop__journey__author")
            .filter(pk=pk)
            .first()
        )
        if not entry:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        journey = entry.stop.journey
        if journey.author_id != request.user.id:
            raise PermissionDenied("Only the journey author can share this moment.")
        if journey.is_hidden:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        stop = entry.stop
        note = (entry.body or "").strip()
        if not note and not (entry.image or "").strip() and not (entry.video or "").strip():
            return Response({"detail": "This moment has nothing to share yet."}, status=status.HTTP_400_BAD_REQUEST)
        lines = [note] if note else []
        lines.append(f"From my journey: {journey.title} · {stop.place_name}")
        lines.append(f"/journeys/{journey.pk}")
        post = Post.objects.create(
            author=request.user,
            body="\n\n".join(lines),
            region=(stop.region or "").strip(),
            place_label=stop.place_name,
            is_delvers=True,
            delvers_board="Journeys",
            post_kind=PostKind.TIP,
        )
        return Response(PostSerializer(post, context={"request": request}).data, status=status.HTTP_201_CREATED)
