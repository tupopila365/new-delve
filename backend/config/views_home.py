from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from config.home_stories import build_home_stories


class HomeStoriesView(APIView):
    """Public home highlights — live content per channel, stock fallback when empty."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        region = (request.query_params.get("region") or "").strip()
        user = request.user if request.user.is_authenticated else None
        if not region and user is not None:
            profile = getattr(user, "profile", None)
            region = (getattr(profile, "region", None) or "").strip()
        payload = build_home_stories(region=region, user=user, request=request)
        return Response(payload)
