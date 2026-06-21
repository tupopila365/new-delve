from rest_framework import serializers

from reports.models import REASON_SEVERITY, Report, ReportReason, ReportSeverity


class ReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ("target_type", "target_id", "target_label", "reason", "description")

    def validate_reason(self, value):
        if value not in dict(ReportReason.choices):
            raise serializers.ValidationError("Invalid reason.")
        return value

    def create(self, validated_data):
        reason = validated_data["reason"]
        validated_data["severity"] = REASON_SEVERITY.get(reason, ReportSeverity.MEDIUM)
        validated_data["reporter"] = self.context["request"].user
        return super().create(validated_data)


class ReportAdminSerializer(serializers.ModelSerializer):
    reporter_username = serializers.CharField(source="reporter.username", read_only=True)
    resolved_by_username = serializers.CharField(source="resolved_by.username", read_only=True, default=None)
    reason_label = serializers.CharField(source="get_reason_display", read_only=True)

    class Meta:
        model = Report
        fields = (
            "id",
            "reporter_username",
            "target_type",
            "target_id",
            "target_label",
            "reason",
            "reason_label",
            "description",
            "status",
            "severity",
            "admin_notes",
            "action_taken",
            "resolved_by_username",
            "resolved_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "reporter_username",
            "target_type",
            "target_id",
            "target_label",
            "reason",
            "reason_label",
            "description",
            "severity",
            "created_at",
        )
