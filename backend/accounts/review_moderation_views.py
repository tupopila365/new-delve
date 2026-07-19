from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsPlatformAdmin
from accounts.review_moderation import list_platform_reviews, set_review_hidden


class PlatformReviewsView(APIView):
    """GET list / PATCH hide|unhide marketplace traveler reviews."""

    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        return Response(
            list_platform_reviews(
                source=request.query_params.get("source") or "",
                hidden=request.query_params.get("hidden") or "",
                limit=int(request.query_params.get("limit") or 100),
            )
        )

    def patch(self, request):
        source = (request.data.get("source") or "").strip()
        review_id = request.data.get("review_id")
        action = (request.data.get("action") or "").strip().lower()
        note = str(request.data.get("reason") or request.data.get("moderation_note") or "")
        try:
            rid = int(review_id)
        except (TypeError, ValueError):
            return Response({"detail": "review_id required."}, status=status.HTTP_400_BAD_REQUEST)
        if action not in ("hide", "unhide"):
            return Response({"detail": "action must be hide or unhide."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            row = set_review_hidden(
                source=source,
                review_id=rid,
                hidden=action == "hide",
                note=note,
            )
        except LookupError:
            return Response({"detail": "Review not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(row)
