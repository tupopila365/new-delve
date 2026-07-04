"""Journey Q&A inbox for travellers who authored journeys."""

from __future__ import annotations

from django.db.models import Prefetch
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from journeys.models import JourneyAnswer, JourneyQuestion
from journeys.qa_serializers import JourneyQuestionSerializer


class MeJourneyQuestionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        visible_answers = JourneyAnswer.objects.filter(is_hidden=False).select_related(
            "author", "author__profile"
        )
        qs = (
            JourneyQuestion.objects.filter(journey__author=request.user, is_hidden=False)
            .select_related("author", "author__profile", "journey")
            .prefetch_related(Prefetch("answers", queryset=visible_answers))
            .order_by("-created_at")[:50]
        )
        rows = []
        for q in qs:
            data = JourneyQuestionSerializer(q).data
            rows.append(
                {
                    **data,
                    "category": "journey",
                    "listing_id": q.journey_id,
                    "listing_title": q.journey.title,
                    "journey_id": q.journey_id,
                }
            )
        return Response(rows)
