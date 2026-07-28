from django.contrib import admin

from .models import (
    AccommodationAvailability,
    AccommodationBooking,
    AccommodationListing,
    AccommodationListingLike,
    AccommodationListingSave,
    AccommodationPageView,
    AccommodationRoomType,
    AccommodationReview,
)


class AccommodationRoomTypeInline(admin.TabularInline):
    model = AccommodationRoomType
    extra = 0
    fields = (
        "name",
        "quantity_available",
        "max_guests",
        "price_per_night",
        "is_active",
        "sort_order",
    )


@admin.register(AccommodationListing)
class AccommodationListingAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "property_type",
        "region",
        "city",
        "owner",
        "business",
        "price_per_night",
        "is_active",
        "rating_avg",
        "rating_count",
        "views_count",
        "created_at",
    )
    list_filter = ("property_type", "is_active", "region", "pet_friendly")
    search_fields = ("title", "city", "region", "owner__username")
    raw_id_fields = ("owner", "business")
    inlines = (AccommodationRoomTypeInline,)
    date_hierarchy = "created_at"


@admin.register(AccommodationBooking)
class AccommodationBookingAdmin(admin.ModelAdmin):
    list_display = (
        "listing",
        "guest",
        "check_in",
        "check_out",
        "guests",
        "status",
        "total_price",
        "hold_expires_at",
        "mock_payment_ref",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = ("listing__title", "guest__username", "mock_payment_ref", "room_type_name")
    raw_id_fields = ("listing", "room_type", "guest")
    readonly_fields = (
        "listing_title_snapshot",
        "room_snapshot",
        "nightly_price_snapshot",
        "expired_at",
    )
    date_hierarchy = "check_in"


@admin.register(AccommodationRoomType)
class AccommodationRoomTypeAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "listing",
        "quantity_available",
        "max_guests",
        "price_per_night",
        "is_active",
    )
    list_filter = ("is_active",)
    search_fields = ("name", "listing__title")
    raw_id_fields = ("listing",)


@admin.register(AccommodationAvailability)
class AccommodationAvailabilityAdmin(admin.ModelAdmin):
    list_display = (
        "date",
        "listing",
        "room_type",
        "is_available",
        "quantity_available",
        "price_override",
    )
    list_filter = ("is_available", "date")
    search_fields = ("listing__title", "room_type__name", "note")
    raw_id_fields = ("listing", "room_type")


@admin.register(AccommodationListingLike)
class AccommodationListingLikeAdmin(admin.ModelAdmin):
    list_display = ("listing", "user", "created_at")
    raw_id_fields = ("listing", "user")


@admin.register(AccommodationListingSave)
class AccommodationListingSaveAdmin(admin.ModelAdmin):
    list_display = ("listing", "user", "created_at")
    raw_id_fields = ("listing", "user")


@admin.register(AccommodationPageView)
class AccommodationPageViewAdmin(admin.ModelAdmin):
    list_display = ("listing", "room_name", "viewer", "created_at")
    list_filter = ("created_at",)
    search_fields = ("listing__title", "room_name", "viewer__username")
    raw_id_fields = ("listing", "viewer")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)


@admin.register(AccommodationReview)
class AccommodationReviewAdmin(admin.ModelAdmin):
    list_display = ("listing", "reviewer", "rating", "created_at")
    list_filter = ("rating",)
    search_fields = ("body", "listing__title", "reviewer__username")
    raw_id_fields = ("listing", "booking", "reviewer")
