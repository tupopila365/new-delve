"""Aggregate listing Q&A across events for provider inbox."""

from __future__ import annotations

from django.db.models import Prefetch
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.business_access import provider_listing_owner_ids
from accounts.permissions import IsProviderOrBusinessMember
from events_app.models import EventAnswer, EventQuestion
from events_app.qa_serializers import EventQuestionSerializer


class ProviderListingQuestionsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def get(self, request):
        owner_ids = provider_listing_owner_ids(request.user)
        rows: list[dict] = []

        event_answers = EventAnswer.objects.filter(is_hidden=False).select_related(
            "author", "author__profile"
        )
        event_qs = (
            EventQuestion.objects.filter(event__organizer_id__in=owner_ids, is_hidden=False)
            .select_related("author", "author__profile", "event")
            .prefetch_related(Prefetch("answers", queryset=event_answers))
            .order_by("-created_at")[:40]
        )
        for q in event_qs:
            data = EventQuestionSerializer(q).data
            rows.append(
                {
                    **data,
                    "category": "event",
                    "listing_id": q.event_id,
                    "listing": q.event_id,
                    "listing_title": q.event.title,
                }
            )

        rows.sort(key=lambda row: row.get("created_at", ""), reverse=True)
        return Response(rows[:100])
