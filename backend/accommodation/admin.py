from django.contrib import admin

from .models import (
    AccommodationBooking,
    AccommodationListing,
    AccommodationListingLike,
    AccommodationListingSave,
    AccommodationQuestion,
    AccommodationAnswer,
    AccommodationReview,
)


@admin.register(AccommodationListing)
class AccommodationListingAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "property_type",
        "region",
        "city",
        "owner",
        "price_per_night",
        "is_active",
        "rating_avg",
        "rating_count",
        "created_at",
    )
    list_filter = ("property_type", "is_active", "region", "pet_friendly")
    search_fields = ("title", "city", "region", "owner__username")
    raw_id_fields = ("owner",)
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
        "mock_payment_ref",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = ("listing__title", "guest__username", "mock_payment_ref", "room_type_name")
    raw_id_fields = ("listing", "guest")
    date_hierarchy = "check_in"


@admin.register(AccommodationListingLike)
class AccommodationListingLikeAdmin(admin.ModelAdmin):
    list_display = ("listing", "user", "created_at")
    raw_id_fields = ("listing", "user")


@admin.register(AccommodationListingSave)
class AccommodationListingSaveAdmin(admin.ModelAdmin):
    list_display = ("listing", "user", "created_at")
    raw_id_fields = ("listing", "user")


@admin.register(AccommodationQuestion)
class AccommodationQuestionAdmin(admin.ModelAdmin):
    list_display = ("listing", "author", "is_hidden", "created_at")
    list_filter = ("is_hidden",)
    search_fields = ("body", "listing__title", "author__username")
    raw_id_fields = ("listing", "author")


@admin.register(AccommodationAnswer)
class AccommodationAnswerAdmin(admin.ModelAdmin):
    list_display = ("question", "author", "is_official", "created_at")
    list_filter = ("is_official",)
    raw_id_fields = ("question", "author")


@admin.register(AccommodationReview)
class AccommodationReviewAdmin(admin.ModelAdmin):
    list_display = ("listing", "reviewer", "rating", "created_at")
    list_filter = ("rating",)
    search_fields = ("body", "listing__title", "reviewer__username")
    raw_id_fields = ("listing", "booking", "reviewer")
