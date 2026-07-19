"""Buyer + staff APIs for marketplace disputes."""

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.marketplace_disputes import (
    get_open_dispute,
    list_disputes_for_admin,
    list_disputes_for_user,
    open_dispute,
    resolve_dispute,
    serialize_dispute,
)
from accounts.models import MarketplaceDispute
from accounts.permissions import IsPlatformAdmin
from accounts.platform_audit import log_admin_action


class MeDisputesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(list_disputes_for_user(request.user))

    def post(self, request):
        source = (request.data.get("source") or "").strip()
        record_id = request.data.get("record_id")
        reason = (request.data.get("reason") or "").strip()
        body = (request.data.get("body") or "").strip()
        try:
            dispute = open_dispute(
                user=request.user,
                source=source,
                record_id=int(record_id),
                reason=reason,
                body=body,
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except (TypeError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        log_admin_action(
            actor=request.user,
            action="dispute_open",
            target_type="dispute",
            target_id=str(dispute.pk),
            detail=f"{dispute.source}:{dispute.record_id}",
        )
        return Response(serialize_dispute(dispute), status=status.HTTP_201_CREATED)


class MeDisputeDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        dispute = (
            MarketplaceDispute.objects.select_related("opener", "seller", "resolved_by")
            .filter(pk=pk, opener=request.user)
            .first()
        )
        if not dispute:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(serialize_dispute(dispute))


class PlatformDisputesView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        return Response(
            list_disputes_for_admin(
                status=(request.query_params.get("status") or "").strip(),
                source=(request.query_params.get("source") or "").strip(),
                search=(request.query_params.get("search") or "").strip(),
                limit=min(int(request.query_params.get("limit") or 200), 300),
            )
        )


class PlatformDisputeDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request, pk):
        dispute = (
            MarketplaceDispute.objects.select_related("opener", "seller", "resolved_by")
            .filter(pk=pk)
            .first()
        )
        if not dispute:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        row = serialize_dispute(dispute)
        open_peer = get_open_dispute(dispute.source, dispute.record_id)
        row["has_active_case"] = bool(open_peer and open_peer.pk == dispute.pk)
        return Response(row)

    def patch(self, request, pk):
        dispute = (
            MarketplaceDispute.objects.select_related("opener", "seller", "resolved_by")
            .filter(pk=pk)
            .first()
        )
        if not dispute:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            updated = resolve_dispute(
                dispute=dispute,
                actor=request.user,
                status=(request.data.get("status") or dispute.status),
                resolution=(request.data.get("resolution") or dispute.resolution or ""),
                resolution_note=(request.data.get("resolution_note") or ""),
                apply_money=bool(request.data.get("apply_money", True)),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serialize_dispute(updated))
