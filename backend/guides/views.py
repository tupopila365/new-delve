import uuid

from django.db.models import Count, Exists, OuterRef, Prefetch, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsEmailVerified, IsServiceProvider

from .models import GuideAnswer, GuideBooking, GuideQuestion, GuideSave, TourGuideProfile
from .qa_serializers import (
    GuideAnswerCreateSerializer,
    GuideAnswerSerializer,
    GuideQuestionCreateSerializer,
    GuideQuestionSerializer,
)
from .review_serializers import GuideReviewCreateSerializer, GuideReviewSerializer
from .review_services import guide_reviews_payload
from .serializers import GuideBookingSerializer, TourGuideProfileSerializer


def _guide_questions_qs(guide):
    answers = GuideAnswer.objects.filter(is_hidden=False).select_related("author", "author__profile")
    return (
        GuideQuestion.objects.filter(guide=guide, is_hidden=False)
        .select_related("author", "author__profile")
        .prefetch_related(Prefetch("answers", queryset=answers))
        .order_by("-created_at")
    )


class TourGuideProfileViewSet(viewsets.ModelViewSet):
    queryset = TourGuideProfile.objects.filter(is_active=True).select_related("user", "user__profile")
    serializer_class = TourGuideProfileSerializer
    search_fields = ("headline", "bio", "regions", "specialities", "languages")
    ordering_fields = ("rating_avg", "hourly_rate", "created_at")
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsServiceProvider()]
        if self.action in ("save", "saved"):
            return [permissions.IsAuthenticated()]
        if self.action == "review":
            return [permissions.IsAuthenticated(), IsEmailVerified()]
        if self.action == "questions" and self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def _annotate_engagement(self, qs, user):
        qs = qs.annotate(saves_count=Count("user_saves", distinct=True))
        if user.is_authenticated:
            qs = qs.annotate(
                saved_by_me=Exists(
                    GuideSave.objects.filter(
                        guide_id=OuterRef("pk"),
                        user_id=user.id,
                    )
                ),
            )
        return qs

    def _apply_list_filters(self, qs):
        """Findability filters: region / language / licensed (JSON-friendly icontains)."""
        region = (self.request.query_params.get("region") or "").strip()
        if region:
            qs = qs.filter(regions__icontains=region)

        language = (self.request.query_params.get("language") or "").strip()
        if language:
            qs = qs.filter(
                Q(languages__icontains=language) | Q(languages_detail__icontains=language)
            )

        licensed = (self.request.query_params.get("licensed") or "").strip().lower()
        if licensed in ("1", "true", "yes"):
            qs = qs.filter(licensed_guide=True)

        return qs

    def get_queryset(self):
        user = self.request.user
        if self.action in ("update", "partial_update", "destroy"):
            return TourGuideProfile.objects.filter(user=user)
        if self.action == "saved":
            if not user.is_authenticated:
                return TourGuideProfile.objects.none()
            qs = (
                TourGuideProfile.objects.filter(is_active=True, user_saves__user=user)
                .select_related("user", "user__profile")
                .distinct()
            )
            return self._annotate_engagement(qs, user)
        if self.action in ("save", "questions", "reviews", "review"):
            qs = TourGuideProfile.objects.filter(is_active=True).select_related("user", "user__profile")
            return self._annotate_engagement(qs, user)
        qs = super().get_queryset()
        if self.action == "list":
            qs = self._apply_list_filters(qs)
        return self._annotate_engagement(qs, user)

    @action(detail=True, methods=["post"])
    def save(self, request, pk=None):
        guide = self.get_object()
        save_obj, created = GuideSave.objects.get_or_create(guide=guide, user=request.user)
        if not created:
            save_obj.delete()
            saved = False
        else:
            saved = True
        saves_count = GuideSave.objects.filter(guide=guide).count()
        return Response({"saved": saved, "saves_count": saves_count})

    @action(detail=False, methods=["get"])
    def saved(self, request):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def reviews(self, request, pk=None):
        guide = self.get_object()
        return Response(guide_reviews_payload(guide))

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        guide = self.get_object()
        ser = GuideReviewCreateSerializer(
            data=request.data,
            context={"request": request, "guide": guide},
        )
        ser.is_valid(raise_exception=True)
        review = ser.save()
        return Response(GuideReviewSerializer(review).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"])
    def questions(self, request, pk=None):
        guide = self.get_object()
        if request.method == "GET":
            qs = _guide_questions_qs(guide)
            return Response(GuideQuestionSerializer(qs, many=True).data)
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        ser = GuideQuestionCreateSerializer(
            data=request.data,
            context={"request": request, "guide": guide},
        )
        ser.is_valid(raise_exception=True)
        question = ser.save()
        return Response(GuideQuestionSerializer(question).data, status=status.HTTP_201_CREATED)


class GuideQuestionAnswerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        question = (
            GuideQuestion.objects.select_related("guide")
            .filter(pk=pk, is_hidden=False)
            .first()
        )
        if not question:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = GuideAnswerCreateSerializer(
            data=request.data,
            context={"request": request, "question": question},
        )
        ser.is_valid(raise_exception=True)
        answer = ser.save()
        return Response(GuideAnswerSerializer(answer).data, status=status.HTTP_201_CREATED)


class GuideBookingViewSet(viewsets.ModelViewSet):
    serializer_class = GuideBookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsEmailVerified]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return (
            GuideBooking.objects.filter(client=self.request.user)
            .select_related("guide", "guide__user", "guide__user__profile")
            .order_by("-created_at")
        )

    @action(detail=True, methods=["post"])
    def mock_pay(self, request, pk=None):
        b = self.get_object()
        if b.client_id != request.user.id:
            return Response({"detail": "Forbidden"}, status=403)
        if b.status != "pending":
            return Response({"detail": "Not payable."}, status=400)
        b.status = "confirmed"
        b.mock_payment_ref = f"mock_{uuid.uuid4().hex[:16]}"
        b.save(update_fields=["status", "mock_payment_ref"])
        return Response(GuideBookingSerializer(b).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        b = self.get_object()
        if b.client_id != request.user.id:
            return Response({"detail": "Forbidden"}, status=403)
        if b.status not in ("pending", "confirmed"):
            return Response({"detail": "This booking cannot be cancelled."}, status=400)
        b.status = "cancelled"
        b.save(update_fields=["status"])
        return Response(GuideBookingSerializer(b).data)
