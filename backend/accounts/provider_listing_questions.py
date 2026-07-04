"""Aggregate listing Q&A across stays, food, guides, transport, and events for provider inbox."""

from __future__ import annotations

from django.db.models import Prefetch
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accommodation.models import AccommodationAnswer, AccommodationQuestion
from accommodation.qa_serializers import AccommodationQuestionSerializer
from accounts.business_access import provider_listing_owner_ids
from accounts.permissions import IsProviderOrBusinessMember
from events_app.models import EventAnswer, EventQuestion
from events_app.qa_serializers import EventQuestionSerializer
from food.models import FoodAnswer, FoodQuestion
from food.qa_serializers import FoodQuestionSerializer
from guides.models import GuideAnswer, GuideQuestion
from guides.qa_serializers import GuideQuestionSerializer
from transport.models import BusTripAnswer, BusTripQuestion, VehicleAnswer, VehicleQuestion
from transport.qa_serializers import BusTripQuestionSerializer, VehicleQuestionSerializer


class ProviderListingQuestionsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def get(self, request):
        owner_ids = provider_listing_owner_ids(request.user)
        rows: list[dict] = []

        stay_answers = AccommodationAnswer.objects.filter(is_hidden=False).select_related(
            "author", "author__profile"
        )
        stay_qs = (
            AccommodationQuestion.objects.filter(
                listing__owner_id__in=owner_ids,
                is_hidden=False,
            )
            .select_related("author", "author__profile", "listing")
            .prefetch_related(Prefetch("answers", queryset=stay_answers))
            .order_by("-created_at")[:40]
        )
        for q in stay_qs:
            data = AccommodationQuestionSerializer(q).data
            rows.append(
                {
                    **data,
                    "category": "stay",
                    "listing_id": q.listing_id,
                    "listing_title": q.listing.title,
                }
            )

        food_answers = FoodAnswer.objects.filter(is_hidden=False).select_related(
            "author", "author__profile"
        )
        food_qs = (
            FoodQuestion.objects.filter(venue__owner_id__in=owner_ids, is_hidden=False)
            .select_related("author", "author__profile", "venue")
            .prefetch_related(Prefetch("answers", queryset=food_answers))
            .order_by("-created_at")[:40]
        )
        for q in food_qs:
            data = FoodQuestionSerializer(q).data
            rows.append(
                {
                    **data,
                    "category": "food",
                    "listing_id": q.venue_id,
                    "listing_title": q.venue.name,
                }
            )

        guide_answers = GuideAnswer.objects.filter(is_hidden=False).select_related(
            "author", "author__profile"
        )
        guide_qs = (
            GuideQuestion.objects.filter(guide__user_id__in=owner_ids, is_hidden=False)
            .select_related("author", "author__profile", "guide")
            .prefetch_related(Prefetch("answers", queryset=guide_answers))
            .order_by("-created_at")[:40]
        )
        for q in guide_qs:
            data = GuideQuestionSerializer(q).data
            rows.append(
                {
                    **data,
                    "category": "guide",
                    "listing_id": q.guide_id,
                    "listing_title": q.guide.headline,
                }
            )

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
