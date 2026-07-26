from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import PlaceSignalKind
from accounts.popular_places import DEFAULT_LIMIT, recommended_places_for_country, record_place_signal
from config.throttles import PlaceSignalThrottle


class RecommendedPlacesView(APIView):
    """Public usage-ranked towns/cities for Explore chips."""

    permission_classes = [AllowAny]

    def get(self, request):
        country = (request.query_params.get("country") or "").strip().upper()
        if len(country) != 2:
            return Response({"detail": "country query param (ISO 2-letter) is required."}, status=400)
        try:
            limit = int(request.query_params.get("limit") or DEFAULT_LIMIT)
        except (TypeError, ValueError):
            limit = DEFAULT_LIMIT
        places = recommended_places_for_country(country, limit=limit)
        return Response({"country": country, "places": places})


class PlaceSignalView(APIView):
    """Anonymous Explore engagement (chip / search / place pick). No PII stored."""

    permission_classes = [AllowAny]
    throttle_classes = [PlaceSignalThrottle]

    def post(self, request):
        country = (request.data.get("country") or "").strip().upper()
        label = (request.data.get("label") or "").strip()
        kind = (request.data.get("kind") or "").strip().lower()
        if len(country) != 2:
            return Response({"detail": "country is required (ISO 2-letter)."}, status=400)
        if not label:
            return Response({"detail": "label is required."}, status=400)
        if kind not in {c.value for c in PlaceSignalKind}:
            return Response(
                {"detail": f"kind must be one of: {', '.join(c.value for c in PlaceSignalKind)}."},
                status=400,
            )
        signal = record_place_signal(country=country, label=label, kind=kind)
        if signal is None:
            return Response({"detail": "ignored"}, status=status.HTTP_202_ACCEPTED)
        return Response({"ok": True}, status=status.HTTP_201_CREATED)
