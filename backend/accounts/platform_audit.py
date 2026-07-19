from __future__ import annotations

from django.contrib.auth import get_user_model

from accounts.models import AdminAuditLog

User = get_user_model()

ACTION_LABELS = {
    "user_suspend": "Account suspended",
    "user_activate": "Account reactivated",
    "user_promote_staff": "Promoted to platform admin",
    "user_demote_staff": "Removed platform admin access",
    "business_verify": "Business verification updated",
    "business_document_review": "Verification document reviewed",
    "report_resolve": "Report resolved",
    "content_remove": "Content removed",
    "content_restore": "Content restored",
    "listing_unpublish": "Listing unpublished",
    "listing_publish": "Listing republished",
    "booking_note": "Booking dispute note added",
    "booking_status": "Booking status updated",
    "dispute_open": "Marketplace dispute opened",
    "dispute_resolve": "Marketplace dispute updated",
    "email_verify_manual": "Email manually verified",
    "email_verify_resend": "Verification email resent",
    "settings_update": "Platform settings updated",
    "user_delete": "Account deleted (GDPR)",
    "user_self_delete": "Account self-deleted",
    "promotion_create": "Featured partner campaign created",
    "promotion_update": "Featured partner campaign updated",
    "promotion_cancel": "Featured partner campaign cancelled",
    "promotion_approve": "Promotion request approved",
    "promotion_reject": "Promotion request rejected",
}


def log_admin_action(
    *,
    actor: User | None,
    action: str,
    target_type: str,
    target_id: str | int,
    detail: str = "",
) -> AdminAuditLog:
    return AdminAuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        detail=detail.strip(),
    )


def audit_activity_text(entry: AdminAuditLog) -> str:
    label = ACTION_LABELS.get(entry.action, entry.action.replace("_", " "))
    actor = entry.actor.username if entry.actor else "System"
    target = f"{entry.target_type} {entry.target_id}"
    if entry.detail:
        return f"{label} — {target} ({entry.detail}) by @{actor}"
    return f"{label} — {target} by @{actor}"


def audit_activity_type(entry: AdminAuditLog) -> str:
    if entry.target_type == "user":
        return "user"
    if entry.target_type == "business":
        return "business"
    if entry.action.startswith("business"):
        return "business"
    if entry.action.startswith("report") or entry.target_type == "report":
        return "report"
    if entry.target_type == "listing" or entry.action.startswith("listing"):
        return "listing"
    if entry.target_type == "booking" or entry.action.startswith("booking"):
        return "booking"
    if entry.target_type == "promotion" or entry.action.startswith("promotion"):
        return "listing"
    return "system"
