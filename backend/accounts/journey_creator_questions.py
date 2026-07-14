"""Journey comment inbox for travellers who authored journeys."""

from __future__ import annotations

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from journeys.comment_queries import journey_comment_queryset
from journeys.models import Journey
from journeys.qa_serializers import JourneyCommentSerializer


class MeJourneyQuestionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        journeys = Journey.objects.filter(author=request.user, is_hidden=False).only("id", "title")
        journey_by_id = {j.id: j for j in journeys}
        if not journey_by_id:
            return Response([])

        rows = []
        for journey_id, journey in journey_by_id.items():
            qs = journey_comment_queryset(journey, request.user, parent_id=None)[:50]
            for comment in qs:
                data = JourneyCommentSerializer(comment, context={"request": request}).data
                rows.append(
                    {
                        **data,
                        "category": "journey",
                        "listing_id": journey_id,
                        "listing_title": journey.title,
                        "journey_id": journey_id,
                    }
                )
        rows.sort(key=lambda row: str(row.get("created_at") or ""), reverse=True)
        return Response(rows[:50])
