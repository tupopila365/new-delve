from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import AdminAuditLog, BusinessMembership, BusinessProfile, BusinessVerificationDocument, EmailVerificationToken, ExplorePlacePin, ListingSale, PendingRegistration, PlaceSignal, PlatformBookingNote, PlatformSettings, PopularPlace, Profile, TravelOffer, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "is_staff", "is_active", "date_joined")
    ordering = ("-date_joined",)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "user_type", "region", "email_verified")
    list_filter = ("user_type", "email_verified")


@admin.register(PendingRegistration)
class PendingRegistrationAdmin(admin.ModelAdmin):
    list_display = ("email", "username", "user_type", "created_at", "token")
    readonly_fields = ("token", "password_hash", "created_at")
    search_fields = ("email", "username")


@admin.register(EmailVerificationToken)
class EmailTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "used", "created_at")
    readonly_fields = ("token", "created_at")


@admin.register(BusinessProfile)
class BusinessProfileAdmin(admin.ModelAdmin):
    list_display = ("business_name", "owner", "verification_status", "showcase_as_partner", "city", "region")
    list_filter = ("verification_status", "showcase_as_partner")
    search_fields = ("business_name", "slug", "owner__username")


@admin.register(TravelOffer)
class TravelOfferAdmin(admin.ModelAdmin):
    list_display = ("title", "business", "offer_kind", "eligibility", "price_label", "is_active", "sort_order")
    list_filter = ("offer_kind", "eligibility", "is_active")
    search_fields = ("title", "business__business_name")


@admin.register(ListingSale)
class ListingSaleAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "vertical",
        "listing_id",
        "owner",
        "sale_price",
        "compare_at_price",
        "badge",
        "is_active",
        "ends_on",
    )
    list_filter = ("vertical", "is_active")
    search_fields = ("title", "owner__username", "badge", "price_label")


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


@admin.register(PopularPlace)
class PopularPlaceAdmin(admin.ModelAdmin):
    list_display = (
        "country_code",
        "rank",
        "label",
        "region",
        "score",
        "listing_count",
        "booking_count",
        "chip_click_count",
        "search_count",
        "updated_at",
    )
    list_filter = ("country_code",)
    search_fields = ("label", "region")
    ordering = ("country_code", "rank")


@admin.register(PlaceSignal)
class PlaceSignalAdmin(admin.ModelAdmin):
    list_display = ("country_code", "label", "kind", "created_at")
    list_filter = ("kind", "country_code")
    search_fields = ("label",)
    readonly_fields = ("created_at",)


@admin.register(ExplorePlacePin)
class ExplorePlacePinAdmin(admin.ModelAdmin):
    list_display = ("country_code", "sort_order", "label", "region", "is_active", "updated_at")
    list_filter = ("country_code", "is_active")
    search_fields = ("label", "region")
    ordering = ("country_code", "sort_order")
