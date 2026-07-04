from django.contrib.auth import get_user_model
from django.utils.dateparse import parse_datetime
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import PlatformSettings
from accounts.permissions import IsPlatformAdmin
from accounts.platform_audit import log_admin_action
from accounts.platform_intelligence import (
    admin_notifications,
    anonymize_user_account,
    platform_analytics,
    serialize_platform_settings,
)

User = get_user_model()


class PlatformAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        days = int(request.query_params.get("days") or 30)
        return Response(platform_analytics(days=days))


class PlatformNotificationsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        return Response(admin_notifications())


class PublicAnnouncementView(APIView):
    """Public home-banner payload — no auth required."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        settings_obj = PlatformSettings.load()
        if not settings_obj.announcement_active:
            return Response({"active": False, "title": "", "body": ""})
        return Response(
            {
                "active": True,
                "title": settings_obj.announcement_title or "",
                "body": settings_obj.announcement_body or "",
            }
        )


class PlatformSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        return Response(serialize_platform_settings(PlatformSettings.load()))


    def patch(self, request):
        settings_obj = PlatformSettings.load()
        data = request.data

        if "feature_flags" in data and isinstance(data["feature_flags"], dict):
            merged = {**settings_obj.feature_flags, **data["feature_flags"]}
            settings_obj.feature_flags = merged

        if "announcement_title" in data:
            settings_obj.announcement_title = str(data["announcement_title"] or "").strip()
        if "announcement_body" in data:
            settings_obj.announcement_body = str(data["announcement_body"] or "").strip()
        if "announcement_active" in data:
            settings_obj.announcement_active = bool(data["announcement_active"])

        settings_obj.updated_by = request.user
        settings_obj.save()

        log_admin_action(
            actor=request.user,
            action="settings_update",
            target_type="platform",
            target_id="settings",
            detail="Platform settings updated",
        )
        return Response(serialize_platform_settings(settings_obj))


class PlatformUserDeleteView(APIView):
    """GDPR-style account deletion — anonymizes PII, unpublishes content, deactivates login."""

    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def post(self, request, pk):
        user = User.objects.select_related("profile").filter(pk=pk).first()
        if not user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        confirm = (request.data.get("confirm_username") or "").strip()
        if confirm != user.username:
            return Response(
                {"detail": "confirm_username must match the account username exactly."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.username.startswith("deleted_"):
            return Response({"detail": "Account is already deleted."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            original_username = user.username
            anonymize_user_account(user, actor=request.user, self_initiated=False)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        log_admin_action(
            actor=request.user,
            action="user_delete",
            target_type="user",
            target_id=pk,
            detail=f"Anonymized @{original_username} — PII removed, content unpublished",
        )
        return Response(
            {
                "detail": "Account deleted. Personal data anonymized; booking records retained without PII.",
                "id": pk,
                "username": user.username,
            }
        )
