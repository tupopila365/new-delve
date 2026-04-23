from django.contrib.auth import get_user_model
from django.db.models import Case, Count, F, FloatField, Q, Value, When
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Comment, Follow, Like, Post, Save
from .serializers import CommentSerializer, FollowSerializer, PostSerializer

User = get_user_model()


class FeedView(APIView):
    """Home feed: ranked by engagement + recency + optional region match."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        region = (request.query_params.get("region") or "").strip()
        if not region and request.user.is_authenticated:
            region = (request.user.profile.region or "").strip()

        qs = (
            Post.objects.filter(is_delvers=False)
            .exclude(is_accommodation_story=True)
            .select_related("author", "author__profile")
            .annotate(
                likes_count=Count("likes", distinct=True),
                saves_count=Count("saves", distinct=True),
                comments_count=Count("comments", distinct=True),
                region_boost=Case(
                    When(region__iexact=region, then=Value(5.0)),
                    default=Value(0.0),
                    output_field=FloatField(),
                ),
            )
            .annotate(
                feed_score=(
                    F("likes_count") * 2.0
                    + F("saves_count") * 3.0
                    + F("comments_count") * 1.5
                    + F("region_boost")
                )
            )
            .order_by("-feed_score", "-created_at")[:50]
        )
        ser = PostSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)


class DelversFeedView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        region = (request.query_params.get("region") or "").strip()
        if not region and request.user.is_authenticated:
            region = (request.user.profile.region or "").strip()

        qs = (
            Post.objects.filter(is_delvers=True)
            .exclude(is_accommodation_story=True)
            .select_related("author", "author__profile")
            .annotate(
                likes_count=Count("likes", distinct=True),
                saves_count=Count("saves", distinct=True),
                comments_count=Count("comments", distinct=True),
                region_boost=Case(
                    When(region__iexact=region, then=Value(5.0)),
                    default=Value(0.0),
                    output_field=FloatField(),
                ),
            )
            .annotate(
                feed_score=(
                    F("likes_count") * 2.5
                    + F("saves_count") * 4.0
                    + F("comments_count") * 1.0
                    + F("region_boost")
                )
            )
            .order_by("-feed_score", "-created_at")[:80]
        )
        ser = PostSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)


class UserPublicPostsView(APIView):
    """All posts by a user (feed + Delvers), newest first — for public profile grids."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        author = get_object_or_404(User.objects.select_related("profile"), username__iexact=username)
        qs = (
            Post.objects.filter(author=author)
            .select_related("author", "author__profile")
            .annotate(
                likes_count=Count("likes", distinct=True),
                saves_count=Count("saves", distinct=True),
                comments_count=Count("comments", distinct=True),
            )
            .order_by("-created_at")[:60]
        )
        ser = PostSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)


class AccommodationStoriesFeedView(APIView):
    """Instagram-style story sources for the Stays module (hosts with photo/video)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = (
            Post.objects.filter(is_accommodation_story=True)
            .filter(Q(image__isnull=False) | Q(video__isnull=False))
            .select_related("author", "author__profile", "listing")
            .annotate(
                likes_count=Count("likes", distinct=True),
                saves_count=Count("saves", distinct=True),
                comments_count=Count("comments", distinct=True),
            )
            .order_by("-created_at")[:120]
        )
        ser = PostSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)


class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.select_related("author", "author__profile", "listing").annotate(
        likes_count=Count("likes", distinct=True),
        saves_count=Count("saves", distinct=True),
        comments_count=Count("comments", distinct=True),
    )
    serializer_class = PostSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_destroy(self, instance):
        if instance.author_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied()
        super().perform_destroy(instance)

    def perform_update(self, serializer):
        if serializer.instance.author_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied()
        super().perform_update(serializer)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        post = self.get_object()
        like, created = Like.objects.get_or_create(post=post, user=request.user)
        if not created:
            like.delete()
            return Response({"liked": False})
        return Response({"liked": True})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def save(self, request, pk=None):
        post = self.get_object()
        s, created = Save.objects.get_or_create(post=post, user=request.user)
        if not created:
            s.delete()
            return Response({"saved": False})
        return Response({"saved": True})

    @action(detail=True, methods=["get", "post"], permission_classes=[permissions.IsAuthenticated])
    def comments(self, request, pk=None):
        post = self.get_object()
        if request.method == "GET":
            qs = post.comments.select_related("author", "author__profile")
            return Response(CommentSerializer(qs, many=True).data)
        ser = CommentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        Comment.objects.create(
            post=post,
            author=request.user,
            body=ser.validated_data["body"],
        )
        return Response({"detail": "ok"}, status=status.HTTP_201_CREATED)


class FollowViewSet(viewsets.ModelViewSet):
    serializer_class = FollowSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Follow.objects.filter(follower=self.request.user)

    def perform_create(self, serializer):
        following_id = serializer.validated_data["following"].id
        if following_id == self.request.user.id:
            from rest_framework.exceptions import ValidationError

            raise ValidationError("Cannot follow yourself.")
        serializer.save(follower=self.request.user)
