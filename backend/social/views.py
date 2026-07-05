from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Case, Count, F, FloatField, IntegerField, Prefetch, Q, Value, When
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.profile_access import can_view_posts, filter_posts_for_viewer
from config.throttles import FollowThrottle, PostCreateThrottle

from .models import Comment, CommentHelpful, Follow, Like, Post, PostKind, Save
from .serializers import CommentSerializer, FollowSerializer, PostSerializer, UserSummarySerializer

User = get_user_model()


def _annotate_post_counts(qs):
    return qs.annotate(
        likes_count=Count("likes", distinct=True),
        saves_count=Count("saves", distinct=True),
        comments_count=Count("comments", distinct=True),
    )


def _accepted_comment_prefetch():
    return Prefetch(
        "comments",
        queryset=Comment.objects.filter(is_hidden=False, is_accepted_answer=True).select_related(
            "author", "author__profile"
        ),
        to_attr="accepted_comments",
    )


def _comment_queryset_for_post(post, user):
    viewer = user if user and user.is_authenticated else None
    qs = (
        post.comments.filter(is_hidden=False)
        .select_related("author", "author__profile")
        .annotate(helpful_count=Count("helpful_votes", distinct=True))
    )
    if viewer:
        qs = qs.annotate(
            marked_helpful_by_me=Count(
                "helpful_votes",
                filter=Q(helpful_votes__user=viewer),
                distinct=True,
            )
        )
    return qs.order_by(
        Case(When(is_accepted_answer=True, then=Value(0)), default=Value(1), output_field=IntegerField()),
        "-helpful_count",
        "created_at",
    )


def _base_post_queryset():
    return Post.objects.filter(is_hidden=False).select_related("author", "author__profile")


class FeedView(APIView):
    """Home feed: ranked by engagement + recency + optional region match."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        region = (request.query_params.get("region") or "").strip()
        if not region and request.user.is_authenticated:
            region = (request.user.profile.region or "").strip()

        kind = (request.query_params.get("kind") or "").strip().lower()
        limit_raw = (request.query_params.get("limit") or "").strip()
        try:
            limit = min(max(int(limit_raw), 1), 50) if limit_raw else 50
        except ValueError:
            limit = 50

        qs = filter_posts_for_viewer(
            _base_post_queryset().filter(is_delvers=False).exclude(is_accommodation_story=True),
            request.user if request.user.is_authenticated else None,
        )
        if kind in (PostKind.TIP, PostKind.QUESTION):
            qs = qs.filter(post_kind=kind)
        qs = _annotate_post_counts(qs).annotate(
            region_boost=Case(
                When(region__iexact=region, then=Value(5.0)),
                default=Value(0.0),
                output_field=FloatField(),
            ),
        ).annotate(
            feed_score=(
                F("likes_count") * 2.0
                + F("saves_count") * 3.0
                + F("comments_count") * 1.5
                + F("region_boost")
            )
        ).order_by("-feed_score", "-created_at")
        qs = qs.prefetch_related(_accepted_comment_prefetch())[:limit]
        ser = PostSerializer(qs, many=True, context={"request": request})
        from promotions.feed_services import inject_feed_promotions
        from promotions.models import PromotionPlacement

        payload = ser.data
        if kind != PostKind.QUESTION:
            payload = inject_feed_promotions(
                ser.data,
                placement=PromotionPlacement.COMMUNITY_FEED,
                region=region,
                context={"request": request},
            )
        return Response(payload)


class DelversFeedView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        region = (request.query_params.get("region") or "").strip()
        if not region and request.user.is_authenticated:
            region = (request.user.profile.region or "").strip()

        qs = filter_posts_for_viewer(
            _base_post_queryset()
            .filter(is_delvers=True)
            .exclude(is_accommodation_story=True)
            .exclude(is_delvers_highlight=True),
            request.user if request.user.is_authenticated else None,
        )
        qs = _annotate_post_counts(qs).annotate(
            region_boost=Case(
                When(region__iexact=region, then=Value(5.0)),
                default=Value(0.0),
                output_field=FloatField(),
            ),
        ).annotate(
            feed_score=(
                F("likes_count") * 2.5
                + F("saves_count") * 4.0
                + F("comments_count") * 1.0
                + F("region_boost")
            )
        ).order_by("-feed_score", "-created_at")[:80]
        ser = PostSerializer(qs, many=True, context={"request": request})
        from promotions.feed_services import inject_feed_promotions
        from promotions.models import PromotionPlacement

        return Response(
            inject_feed_promotions(
                ser.data,
                placement=PromotionPlacement.DELVERS_FEED,
                region=region,
                context={"request": request},
            )
        )


class DelversHighlightsView(APIView):
    """Story-ring highlights for Delvers — not mixed into the pin feed."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        region = (request.query_params.get("region") or "").strip()
        if not region and request.user.is_authenticated:
            region = (request.user.profile.region or "").strip()

        qs = filter_posts_for_viewer(
            _base_post_queryset().filter(is_delvers_highlight=True),
            request.user if request.user.is_authenticated else None,
        )
        if region:
            qs = qs.filter(Q(region__iexact=region) | Q(region__icontains=region))
        qs = _annotate_post_counts(qs).order_by("-created_at")[:120]
        ser = PostSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)


class UserPublicPostsView(APIView):
    """All posts by a user (feed + Delvers), newest first — for public profile grids."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        author = get_object_or_404(User.objects.select_related("profile"), username__iexact=username)
        viewer = request.user if request.user.is_authenticated else None
        if not can_view_posts(viewer, author):
            return Response([])

        qs = (
            _annotate_post_counts(
                _base_post_queryset().filter(author=author).exclude(is_delvers_highlight=True)
            )
            .order_by("-created_at")[:60]
        )
        ser = PostSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)


class UserFollowToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [FollowThrottle]

    def post(self, request, username):
        target = get_object_or_404(User.objects.select_related("profile"), username__iexact=username)
        if target.pk == request.user.pk:
            return Response({"detail": "Cannot follow yourself."}, status=status.HTTP_400_BAD_REQUEST)

        follow, created = Follow.objects.get_or_create(follower=request.user, following=target)
        if not created:
            follow.delete()
            following = False
        else:
            following = True

        followers_count = Follow.objects.filter(following=target).count()
        return Response({"following": following, "followers_count": followers_count})


class UserFollowersView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        user = get_object_or_404(User.objects.select_related("profile"), username__iexact=username)
        if not can_view_posts(request.user if request.user.is_authenticated else None, user):
            return Response([])
        follower_ids = (
            Follow.objects.filter(following=user)
            .order_by("-created_at")
            .values_list("follower_id", flat=True)
        )
        users = User.objects.filter(pk__in=follower_ids).select_related("profile")
        order = {uid: idx for idx, uid in enumerate(follower_ids)}
        users = sorted(users, key=lambda u: order.get(u.pk, 9999))
        return Response(UserSummarySerializer(users, many=True, context={"request": request}).data)


class UserFollowingView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        user = get_object_or_404(User.objects.select_related("profile"), username__iexact=username)
        if not can_view_posts(request.user if request.user.is_authenticated else None, user):
            return Response([])
        following_ids = (
            Follow.objects.filter(follower=user)
            .order_by("-created_at")
            .values_list("following_id", flat=True)
        )
        users = User.objects.filter(pk__in=following_ids).select_related("profile")
        order = {uid: idx for idx, uid in enumerate(following_ids)}
        users = sorted(users, key=lambda u: order.get(u.pk, 9999))
        return Response(UserSummarySerializer(users, many=True, context={"request": request}).data)


class AccommodationStoriesFeedView(APIView):
    """Instagram-style story sources for the Stays module (hosts with photo/video)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = filter_posts_for_viewer(
            _base_post_queryset()
            .filter(is_accommodation_story=True)
            .filter(Q(image__isnull=False) | Q(video__isnull=False))
            .select_related("listing"),
            request.user if request.user.is_authenticated else None,
        )
        qs = _annotate_post_counts(qs).order_by("-created_at")[:120]
        ser = PostSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)


class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.select_related("author", "author__profile", "listing").annotate(
        likes_count=Count("likes", distinct=True),
        saves_count=Count("saves", distinct=True),
        comments_count=Count("comments", distinct=True),
    )
    serializer_class = PostSerializer

    def get_queryset(self):
        qs = super().get_queryset().filter(is_hidden=False)
        saved_by = (self.request.query_params.get("saved_by") or "").strip()
        if saved_by:
            target = get_object_or_404(User.objects.select_related("profile"), username__iexact=saved_by)
            viewer = self.request.user
            if not viewer.is_authenticated or viewer.pk != target.pk:
                raise PermissionDenied("You can only view your own saved posts.")
            qs = qs.filter(saves__user=target).distinct()

        if self.action in ("list", "retrieve", "similar", "comments", "like", "save"):
            qs = filter_posts_for_viewer(qs, self.request.user if self.request.user.is_authenticated else None)
        return qs

    def retrieve(self, request, *args, **kwargs):
        post = self.get_object()
        viewer = request.user if request.user.is_authenticated else None
        if not can_view_posts(viewer, post.author):
            raise NotFound()
        return super().retrieve(request, *args, **kwargs)

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_throttles(self):
        if self.action == "create":
            return [PostCreateThrottle()]
        return super().get_throttles()

    def perform_destroy(self, instance):
        if instance.author_id != self.request.user.id:
            raise PermissionDenied()
        super().perform_destroy(instance)

    def perform_update(self, serializer):
        if serializer.instance.author_id != self.request.user.id:
            raise PermissionDenied()
        super().perform_update(serializer)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        post = self.get_object()
        if not can_view_posts(request.user, post.author):
            raise NotFound()
        like, created = Like.objects.get_or_create(post=post, user=request.user)
        if not created:
            like.delete()
            return Response({"liked": False})
        return Response({"liked": True})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def save(self, request, pk=None):
        post = self.get_object()
        if not can_view_posts(request.user, post.author):
            raise NotFound()
        s, created = Save.objects.get_or_create(post=post, user=request.user)
        if not created:
            s.delete()
            return Response({"saved": False})
        return Response({"saved": True})

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[permissions.AllowAny],
        url_path="similar",
    )
    def similar(self, request, pk=None):
        """Related posts: same Delvers board (if any), then author, region, then Delvers feed."""
        post = self.get_object()
        if not can_view_posts(request.user if request.user.is_authenticated else None, post.author):
            raise NotFound()

        base = filter_posts_for_viewer(
            Post.objects.exclude(pk=post.pk)
            .exclude(is_accommodation_story=True)
            .exclude(is_delvers_highlight=True)
            .filter(is_hidden=False)
            .select_related("author", "author__profile"),
            request.user if request.user.is_authenticated else None,
        )
        base = _annotate_post_counts(base)
        ordered_ids: list[int] = []
        seen: set[int] = set()

        def take_from(qs, limit: int) -> None:
            n = 0
            for row in qs:
                if row.pk in seen:
                    continue
                seen.add(row.pk)
                ordered_ids.append(row.pk)
                n += 1
                if n >= limit:
                    break

        board = (post.delvers_board or "").strip()
        if post.is_delvers and board:
            take_from(
                base.filter(is_delvers=True, delvers_board__iexact=board).order_by("-created_at"),
                14,
            )
        take_from(base.filter(author=post.author).order_by("-created_at"), 10)
        if (post.region or "").strip():
            take_from(
                base.filter(region__iexact=post.region.strip()).order_by("-created_at"),
                10,
            )
        take_from(base.filter(is_delvers=True).order_by("-created_at"), 12)
        take_from(base.order_by("-created_at"), 16)

        if not ordered_ids:
            return Response([])

        top_ids = ordered_ids[:20]
        order_case = Case(
            *[When(pk=uid, then=pos) for pos, uid in enumerate(top_ids)],
            output_field=IntegerField(),
        )
        qs = base.filter(pk__in=top_ids).order_by(order_case)
        return Response(PostSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["get", "post"], permission_classes=[permissions.AllowAny])
    def comments(self, request, pk=None):
        post = self.get_object()
        if not can_view_posts(request.user if request.user.is_authenticated else None, post.author):
            raise NotFound()
        if request.method == "GET":
            qs = _comment_queryset_for_post(post, request.user)
            return Response(CommentSerializer(qs, many=True, context={"request": request}).data)
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)
        ser = CommentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        Comment.objects.create(
            post=post,
            author=request.user,
            body=ser.validated_data["body"],
        )
        return Response({"detail": "ok"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated], url_path="share-answer-to-delvers")
    def share_answer_to_delvers(self, request, pk=None):
        """Turn the accepted answer on a community question into a Delvers tip post."""
        post = self.get_object()
        if post.post_kind != PostKind.QUESTION:
            return Response({"detail": "Only ask-locals questions can be shared to Delvers."}, status=status.HTTP_400_BAD_REQUEST)
        if post.author_id != request.user.id:
            raise PermissionDenied("Only the question author can share the accepted answer.")
        accepted = post.comments.filter(is_hidden=False, is_accepted_answer=True).select_related("author").first()
        if not accepted:
            return Response({"detail": "Mark an accepted answer before sharing to Delvers."}, status=status.HTTP_400_BAD_REQUEST)
        body = (accepted.body or "").strip()
        if not body:
            return Response({"detail": "Accepted answer is empty."}, status=status.HTTP_400_BAD_REQUEST)
        tip_body = f"Local answer: {body}\n\n— thanks to @{accepted.author.username}"
        if post.place_label:
            tip_body = f"{post.place_label}\n\n{tip_body}"
        elif post.region:
            tip_body = f"{post.region}\n\n{tip_body}"
        delvers_post = Post.objects.create(
            author=request.user,
            body=tip_body[:2000],
            region=post.region,
            place_label=post.place_label,
            is_delvers=True,
            post_kind=PostKind.TIP,
            listing=post.listing,
            event=post.event,
        )
        ser = PostSerializer(delvers_post, context={"request": request})
        return Response(ser.data, status=status.HTTP_201_CREATED)


class CommentAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        comment = get_object_or_404(
            Comment.objects.select_related("post", "post__author"),
            pk=pk,
            is_hidden=False,
        )
        post = comment.post
        if post.post_kind != PostKind.QUESTION:
            return Response({"detail": "Only answers on ask-locals questions can be accepted."}, status=status.HTTP_400_BAD_REQUEST)
        if post.author_id != request.user.id and not request.user.is_staff:
            raise PermissionDenied("Only the question author can accept an answer.")
        Comment.objects.filter(post=post, is_accepted_answer=True).exclude(pk=comment.pk).update(
            is_accepted_answer=False
        )
        if comment.is_accepted_answer:
            comment.is_accepted_answer = False
            comment.save(update_fields=["is_accepted_answer"])
            accepted = False
        else:
            comment.is_accepted_answer = True
            comment.save(update_fields=["is_accepted_answer"])
            accepted = True
        qs = _comment_queryset_for_post(post, request.user).filter(pk=comment.pk)
        row = qs.first()
        return Response(
            {
                "accepted": accepted,
                "comment": CommentSerializer(row, context={"request": request}).data,
            }
        )


class CommentHelpfulView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        comment = get_object_or_404(Comment.objects.select_related("post"), pk=pk, is_hidden=False)
        post = comment.post
        if not can_view_posts(request.user, post.author):
            raise NotFound()
        vote, created = CommentHelpful.objects.get_or_create(comment=comment, user=request.user)
        if not created:
            vote.delete()
            marked = False
        else:
            marked = True
        helpful_count = CommentHelpful.objects.filter(comment=comment).count()
        return Response({"marked_helpful": marked, "helpful_count": helpful_count})


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
