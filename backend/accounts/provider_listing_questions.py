"""Aggregate listing Q&A across transport and events for provider inbox."""

from __future__ import annotations

from django.db.models import Prefetch
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.business_access import provider_listing_owner_ids
from accounts.permissions import IsProviderOrBusinessMember
from events_app.models import EventAnswer, EventQuestion
from events_app.qa_serializers import EventQuestionSerializer
from transport.models import BusTripAnswer, BusTripQuestion, VehicleAnswer, VehicleQuestion
from transport.qa_serializers import BusTripQuestionSerializer, VehicleQuestionSerializer


class ProviderListingQuestionsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def get(self, request):
        owner_ids = provider_listing_owner_ids(request.user)
        rows: list[dict] = []

        vehicle_answers = VehicleAnswer.objects.filter(is_hidden=False).select_related(
            "author", "author__profile"
        )
        vehicle_qs = (
            VehicleQuestion.objects.filter(listing__owner_id__in=owner_ids, is_hidden=False)
            .select_related("author", "author__profile", "listing")
            .prefetch_related(Prefetch("answers", queryset=vehicle_answers))
            .order_by("-created_at")[:40]
        )
        for q in vehicle_qs:
            data = VehicleQuestionSerializer(q).data
            rows.append(
                {
                    **data,
                    "category": "vehicle",
                    "listing_id": q.listing_id,
                    "listing_title": q.listing.title,
                }
            )

        bus_answers = BusTripAnswer.objects.filter(is_hidden=False).select_related(
            "author", "author__profile"
        )
        bus_qs = (
            BusTripQuestion.objects.filter(
                trip__route__operator__owner_id__in=owner_ids,
                is_hidden=False,
            )
            .select_related("author", "author__profile", "trip", "trip__route")
            .prefetch_related(Prefetch("answers", queryset=bus_answers))
            .order_by("-created_at")[:40]
        )
        for q in bus_qs:
            data = BusTripQuestionSerializer(q).data
            route = q.trip.route
            rows.append(
                {
                    **data,
                    "category": "bus_trip",
                    "listing_id": q.trip_id,
                    "listing_title": f"{route.origin} → {route.destination}",
                }
            )

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
