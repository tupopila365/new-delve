from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import AdminAuditLog, BusinessMembership, BusinessProfile, BusinessVerificationDocument, EmailVerificationToken, PlatformBookingNote, PlatformSettings, Profile, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "is_staff", "is_active", "date_joined")
    ordering = ("-date_joined",)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "user_type", "region", "email_verified")
    list_filter = ("user_type", "email_verified")


@admin.register(EmailVerificationToken)
class EmailTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "used", "created_at")
    readonly_fields = ("token", "created_at")


@admin.register(BusinessProfile)
class BusinessProfileAdmin(admin.ModelAdmin):
    list_display = ("business_name", "owner", "verification_status", "city", "region")
    list_filter = ("verification_status",)
    search_fields = ("business_name", "slug", "owner__username")


@admin.register(BusinessMembership)
class BusinessMembershipAdmin(admin.ModelAdmin):
    list_display = ("business", "user", "role", "created_at")
    list_filter = ("role",)


@admin.register(BusinessVerificationDocument)
class BusinessVerificationDocumentAdmin(admin.ModelAdmin):
    list_display = ("business", "doc_type", "status", "uploaded_at")
    list_filter = ("status", "doc_type")


@admin.register(AdminAuditLog)
class AdminAuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "target_type", "target_id", "actor", "created_at")
    list_filter = ("action", "target_type")
    readonly_fields = ("created_at",)


@admin.register(PlatformBookingNote)
class PlatformBookingNoteAdmin(admin.ModelAdmin):
    list_display = ("booking_type", "booking_id", "author", "created_at")
    list_filter = ("booking_type",)


@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ("singleton_key", "announcement_active", "updated_at", "updated_by")
