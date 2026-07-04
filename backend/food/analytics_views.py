"""Provider food analytics API (Phase 6)."""

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.business_access import provider_listing_owner_ids
from accounts.permissions import IsProviderOrBusinessMember

from .analytics_services import provider_food_analytics


class FoodProviderAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def get(self, request):
        days_raw = request.query_params.get("days", "30")
        try:
            days = max(1, min(365, int(days_raw)))
        except (TypeError, ValueError):
            days = 30
        owner_ids = list(provider_listing_owner_ids(request.user))
        return Response(provider_food_analytics(owner_ids=owner_ids, days=days))
