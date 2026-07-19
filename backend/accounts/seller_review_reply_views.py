from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsProviderOrBusinessMember
from accounts.seller_review_replies import list_provider_reviews, set_seller_reply


class ProviderReviewsView(APIView):
    """GET aggregated marketplace reviews for the signed-in provider."""

    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def get(self, request):
        return Response(
            list_provider_reviews(
                request.user,
                source=request.query_params.get("source") or "",
                needs_reply=request.query_params.get("needs_reply") or "",
                limit=int(request.query_params.get("limit") or 200),
            )
        )


class ProviderReviewReplyView(APIView):
    """POST/PATCH seller reply on a owned review. Empty reply clears it."""

    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def post(self, request, source: str, review_id: int):
        return self._save(request, source, review_id)

    def patch(self, request, source: str, review_id: int):
        return self._save(request, source, review_id)

    def _save(self, request, source: str, review_id: int):
        reply = request.data.get("reply")
        if reply is None:
            reply = request.data.get("seller_reply")
        if reply is None:
            return Response({"detail": "reply required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            row = set_seller_reply(
                user=request.user,
                source=source,
                review_id=review_id,
                reply=str(reply),
            )
        except LookupError:
            return Response({"detail": "Review not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(row)
