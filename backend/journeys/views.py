from django.contrib.auth import get_user_model
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from social.models import Post, PostKind
from social.serializers import PostSerializer

from .models import (
    Journey,
    JourneyAnswer,
    JourneyEntry,
    JourneyLike,
    JourneyQuestion,
    JourneySave,
    JourneyStop,
    JourneyVisibility,
)
from .qa_serializers import (
    JourneyAnswerCreateSerializer,
    JourneyAnswerSerializer,
    JourneyQuestionCreateSerializer,
    JourneyQuestionSerializer,
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


def _journey_questions_qs(journey):
    visible_answers = JourneyAnswer.objects.filter(is_hidden=False).select_related(
        "author", "author__profile"
    )
    return (
        JourneyQuestion.objects.filter(journey=journey, is_hidden=False)
        .select_related("author", "author__profile", "journey")
        .prefetch_related(Prefetch("answers", queryset=visible_answers))
        .order_by("-created_at")[:50]
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
        featured_raw = (self.request.query_params.get("featured") or "").strip().lower()
        featured_first_raw = (self.request.query_params.get("featured_first") or "").strip().lower()
        if featured_raw in ("1", "true", "yes"):
            qs = qs.filter(is_featured=True).order_by("-saves_count", "-likes_count", "-created_at")
        elif featured_first_raw in ("1", "true", "yes"):
            # Admin-featured journeys first, then newest organic.
            qs = qs.order_by("-is_featured", "-created_at")
        else:
            qs = qs.order_by("-created_at")

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
        if self.action in ("create", "update", "partial_update", "destroy", "like", "save", "questions"):
            if self.action == "questions" and self.request.method == "GET":
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
    def questions(self, request, pk=None):
        journey = self.get_object()
        viewer = request.user if request.user.is_authenticated else None
        if not can_view_journey(viewer, journey):
            raise NotFound()
        if request.method == "GET":
            qs = _journey_questions_qs(journey)
            return Response(JourneyQuestionSerializer(qs, many=True).data)
        ser = JourneyQuestionCreateSerializer(
            data=request.data,
            context={"request": request, "journey": journey},
        )
        ser.is_valid(raise_exception=True)
        question = ser.save()
        journey.comments_count = JourneyQuestion.objects.filter(journey=journey, is_hidden=False).count()
        journey.save(update_fields=["comments_count"])
        return Response(JourneyQuestionSerializer(question).data, status=status.HTTP_201_CREATED)


class JourneyQuestionAnswerView(APIView):
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
        answer = ser.save()
        return Response(JourneyAnswerSerializer(answer).data, status=status.HTTP_201_CREATED)


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
