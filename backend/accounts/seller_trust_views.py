from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.seller_trust import get_seller_trust


class SellerTrustByUsernameView(APIView):
    """GET /api/accounts/sellers/<username>/trust/ — public seller trust snapshot."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        try:
            data = get_seller_trust(username=username)
        except LookupError:
            return Response({"detail": "Seller not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(data)


class BusinessTrustView(APIView):
    """GET /api/accounts/businesses/<pk>/trust/ — trust for a business owner."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            data = get_seller_trust(business_id=pk)
        except LookupError:
            return Response({"detail": "Business not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(data)
