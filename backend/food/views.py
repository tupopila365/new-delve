import django_filters
from django.db.models import Count, Exists, OuterRef, Prefetch
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsEmailVerified, IsServiceProvider

from .models import FoodAnswer, FoodQuestion, FoodVenue, FoodVenueLike, FoodVenueReview, FoodVenueSave
from .qa_serializers import (
    FoodAnswerCreateSerializer,
    FoodAnswerSerializer,
    FoodQuestionCreateSerializer,
    FoodQuestionSerializer,
)
from .review_serializers import FoodVenueReviewCreateSerializer, FoodVenueReviewSerializer
from .review_services import food_venue_reviews_payload
from .serializers import FoodVenueSerializer


class FoodVenueFilter(django_filters.FilterSet):
    min_price_level = django_filters.NumberFilter(field_name="price_level", lookup_expr="gte")
    max_price_level = django_filters.NumberFilter(field_name="price_level", lookup_expr="lte")

    class Meta:
        model = FoodVenue
        fields = ["cuisine", "region", "city", "is_active"]


def _food_questions_qs(venue):
    visible_answers = FoodAnswer.objects.filter(is_hidden=False).select_related(
        "author", "author__profile"
    )
    return (
        FoodQuestion.objects.filter(venue=venue, is_hidden=False)
        .select_related("author", "author__profile", "venue")
        .prefetch_related(Prefetch("answers", queryset=visible_answers))
        .order_by("-created_at")[:50]
    )


class FoodVenueViewSet(viewsets.ModelViewSet):
    queryset = FoodVenue.objects.filter(is_active=True).select_related("owner", "owner__profile")
    serializer_class = FoodVenueSerializer
    filterset_class = FoodVenueFilter
    search_fields = ("name", "description", "region", "city")
    ordering_fields = ("name", "created_at")
    ordering = ["name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsServiceProvider()]
        if self.action in ("save", "like"):
            return [permissions.IsAuthenticated()]
        if self.action == "saved":
            return [permissions.IsAuthenticated()]
        if self.action == "review":
            return [permissions.IsAuthenticated(), IsEmailVerified()]
        if self.action == "questions" and self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def _annotate_engagement(self, qs, user):
        qs = qs.annotate(
            likes_count=Count("user_likes", distinct=True),
            saves_count=Count("user_saves", distinct=True),
        )
        if user.is_authenticated:
            qs = qs.annotate(
                saved_by_me=Exists(
                    FoodVenueSave.objects.filter(
                        venue_id=OuterRef("pk"),
                        user_id=user.id,
                    )
                ),
                liked_by_me=Exists(
                    FoodVenueLike.objects.filter(
                        venue_id=OuterRef("pk"),
                        user_id=user.id,
                    )
                ),
            )
        return qs

    def get_queryset(self):
        user = self.request.user
        if self.action in ("update", "partial_update", "destroy"):
            return FoodVenue.objects.filter(owner=user)
        if self.action == "saved":
            if not user.is_authenticated:
                return FoodVenue.objects.none()
            qs = (
                FoodVenue.objects.filter(is_active=True, user_saves__user=user)
                .select_related("owner", "owner__profile")
                .distinct()
            )
            return self._annotate_engagement(qs, user)
        if self.action in ("moments", "questions", "reviews", "review", "save", "like"):
            qs = FoodVenue.objects.filter(is_active=True).select_related("owner", "owner__profile")
            return self._annotate_engagement(qs, user)
        qs = super().get_queryset()
        return self._annotate_engagement(qs, user)

    @action(detail=True, methods=["get"])
    def moments(self, request, pk=None):
        from social.models import Post
        from social.serializers import PostSerializer

        venue = self.get_object()
        posts = (
            Post.objects.filter(
                food_venue=venue,
                is_delvers=True,
                is_accommodation_story=False,
                is_hidden=False,
            )
            .select_related("author", "author__profile")
            .order_by("-created_at")[:24]
        )
        ser = PostSerializer(posts, many=True, context={"request": request})
        return Response(ser.data)

    @action(detail=True, methods=["get"])
    def reviews(self, request, pk=None):
        venue = self.get_object()
        return Response(food_venue_reviews_payload(venue))

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        venue = self.get_object()
        ser = FoodVenueReviewCreateSerializer(
            data=request.data,
            context={"request": request, "venue": venue},
        )
        ser.is_valid(raise_exception=True)
        review = ser.save()
        return Response(FoodVenueReviewSerializer(review).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def save(self, request, pk=None):
        venue = self.get_object()
        save_obj, created = FoodVenueSave.objects.get_or_create(
            venue=venue,
            user=request.user,
        )
        if not created:
            save_obj.delete()
            saved = False
        else:
            saved = True
        saves_count = FoodVenueSave.objects.filter(venue=venue).count()
        return Response({"saved": saved, "saves_count": saves_count})

    @action(detail=True, methods=["post"])
    def like(self, request, pk=None):
        venue = self.get_object()
        like_obj, created = FoodVenueLike.objects.get_or_create(
            venue=venue,
            user=request.user,
        )
        if not created:
            like_obj.delete()
            liked = False
        else:
            liked = True
        likes_count = FoodVenueLike.objects.filter(venue=venue).count()
        return Response({"liked": liked, "likes_count": likes_count})

    @action(detail=False, methods=["get"])
    def saved(self, request):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"])
    def questions(self, request, pk=None):
        venue = self.get_object()
        if request.method == "GET":
            qs = _food_questions_qs(venue)
            return Response(FoodQuestionSerializer(qs, many=True).data)
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        ser = FoodQuestionCreateSerializer(
            data=request.data,
            context={"request": request, "venue": venue},
        )
        ser.is_valid(raise_exception=True)
        question = ser.save()
        return Response(FoodQuestionSerializer(question).data, status=status.HTTP_201_CREATED)


class FoodQuestionAnswerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        question = (
            FoodQuestion.objects.select_related("venue")
            .filter(pk=pk, is_hidden=False)
            .first()
        )
        if not question:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = FoodAnswerCreateSerializer(
            data=request.data,
            context={"request": request, "question": question},
        )
        ser.is_valid(raise_exception=True)
        answer = ser.save()
        return Response(FoodAnswerSerializer(answer).data, status=status.HTTP_201_CREATED)
