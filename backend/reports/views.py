from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsPlatformAdmin
from accounts.platform_audit import log_admin_action
from reports.models import Report, ReportAction, ReportStatus
from reports.serializers import ReportAdminSerializer, ReportCreateSerializer
from reports.services import apply_report_action, list_flagged_content, set_content_hidden


class ReportCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ReportCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        report = serializer.save()
        return Response(
            ReportAdminSerializer(report).data,
            status=status.HTTP_201_CREATED,
        )


class PlatformReportsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        qs = Report.objects.select_related("reporter", "resolved_by").order_by("-created_at")
        status_filter = (request.query_params.get("status") or "").strip()
        severity = (request.query_params.get("severity") or "").strip()
        target_type = (request.query_params.get("target_type") or "").strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        if severity:
            qs = qs.filter(severity=severity)
        if target_type:
            qs = qs.filter(target_type=target_type)
        limit = min(int(request.query_params.get("limit") or 100), 200)
        data = ReportAdminSerializer(qs[:limit], many=True).data
        return Response(data)


class PlatformReportDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request, pk):
        report = Report.objects.select_related("reporter", "resolved_by").filter(pk=pk).first()
        if not report:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ReportAdminSerializer(report).data)

    def patch(self, request, pk):
        report = Report.objects.select_related("reporter").filter(pk=pk).first()
        if not report:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = (request.data.get("status") or "").strip()
        action = (request.data.get("action") or request.data.get("action_taken") or "").strip()
        admin_notes = (request.data.get("admin_notes") or "").strip()

        if new_status and new_status in dict(ReportStatus.choices):
            report.status = new_status

        if admin_notes:
            report.admin_notes = admin_notes

        if action:
            try:
                apply_report_action(report, action, actor=request.user)
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            report.action_taken = action
            if report.status in (ReportStatus.NEW, ReportStatus.UNDER_REVIEW):
                report.status = (
                    ReportStatus.DISMISSED
                    if action == ReportAction.DISMISS
                    else ReportStatus.RESOLVED
                )

        report.resolved_by = request.user
        report.resolved_at = timezone.now()
        report.save()

        log_admin_action(
            actor=request.user,
            action="report_resolve",
            target_type="report",
            target_id=report.pk,
            detail=f"{action or new_status} — {report.target_type}:{report.target_id}",
        )

        return Response(ReportAdminSerializer(report).data)


class PlatformModerationContentView(APIView):
    """List hidden / reported content for moderation."""

    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        return Response(list_flagged_content())

    def patch(self, request):
        target_type = (request.data.get("target_type") or "").strip()
        target_id = (request.data.get("target_id") or "").strip()
        action = (request.data.get("action") or "").strip()
        reason = (request.data.get("reason") or "").strip()
        if not target_type or not target_id or action not in ("remove", "restore"):
            return Response(
                {"detail": "target_type, target_id, and action (remove|restore) are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            set_content_hidden(target_type, target_id, hidden=(action == "remove"), reason=reason)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        detail = reason
        if target_type == "post":
            from social.models import Post

            post = Post.objects.filter(pk=target_id).select_related("author").first()
            if post:
                detail = f"@{post.author.username} — {reason}".strip(" —")
        elif target_type == "journey":
            from journeys.models import Journey

            journey = Journey.objects.filter(pk=target_id).select_related("author").first()
            if journey:
                detail = f"@{journey.author.username} — {journey.title} — {reason}".strip(" —")

        log_admin_action(
            actor=request.user,
            action="content_restore" if action == "restore" else "content_remove",
            target_type=target_type,
            target_id=target_id,
            detail=detail,
        )
        return Response({"ok": True, "action": action})
