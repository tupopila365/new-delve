from django.conf import settings
from django.db import models


class ReportTargetType(models.TextChoices):
    USER = "user", "User profile"
    POST = "post", "Delvers post"
    COMMENT = "comment", "Comment"
    LISTING = "listing", "Listing"
    BUSINESS = "business", "Business"
    MESSAGE = "message", "Message"
    CONVERSATION = "conversation", "Conversation"


class ReportReason(models.TextChoices):
    SPAM = "spam", "Spam or misleading"
    HARASSMENT = "harassment", "Harassment or abuse"
    FAKE = "fake_or_misleading", "Fake or misleading"
    SAFETY = "safety_concern", "Safety concern"
    INAPPROPRIATE = "inappropriate_content", "Inappropriate content"
    FRAUD = "fraud", "Fraud or scam"
    OTHER = "other", "Other"


class ReportSeverity(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


class ReportStatus(models.TextChoices):
    NEW = "new", "New"
    UNDER_REVIEW = "under_review", "Under review"
    ESCALATED = "escalated", "Escalated"
    RESOLVED = "resolved", "Resolved"
    DISMISSED = "dismissed", "Dismissed"


class ReportAction(models.TextChoices):
    NONE = "", "None"
    DISMISS = "dismiss", "Dismissed"
    WARN = "warn", "Warning sent"
    SUSPEND = "suspend", "User suspended"
    REMOVE_CONTENT = "remove_content", "Content removed"
    RESTORE_CONTENT = "restore_content", "Content restored"


REASON_SEVERITY = {
    ReportReason.SPAM: ReportSeverity.MEDIUM,
    ReportReason.HARASSMENT: ReportSeverity.HIGH,
    ReportReason.FAKE: ReportSeverity.MEDIUM,
    ReportReason.SAFETY: ReportSeverity.CRITICAL,
    ReportReason.INAPPROPRIATE: ReportSeverity.MEDIUM,
    ReportReason.FRAUD: ReportSeverity.HIGH,
    ReportReason.OTHER: ReportSeverity.LOW,
}


class Report(models.Model):
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reports_filed",
    )
    target_type = models.CharField(max_length=32, choices=ReportTargetType.choices)
    target_id = models.CharField(max_length=64)
    target_label = models.CharField(max_length=255, blank=True)
    reason = models.CharField(max_length=40, choices=ReportReason.choices)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=ReportStatus.choices,
        default=ReportStatus.NEW,
    )
    severity = models.CharField(
        max_length=16,
        choices=ReportSeverity.choices,
        default=ReportSeverity.MEDIUM,
    )
    admin_notes = models.TextField(blank=True)
    action_taken = models.CharField(
        max_length=32,
        choices=ReportAction.choices,
        blank=True,
        default="",
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reports_resolved",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["target_type", "target_id"]),
        ]

    def __str__(self):
        return f"Report #{self.pk} — {self.target_type}:{self.target_id}"
