from django.contrib import admin

from .models import ActivityListing, ActivityReview, ActivitySave


@admin.register(ActivityListing)
class ActivityListingAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "owner",
        "category",
        "country_code",
        "city",
        "price_from",
        "currency",
        "rating_avg",
        "rating_count",
        "is_active",
        "created_at",
    )
    list_filter = ("category", "is_active", "is_featured", "country_code")
    search_fields = ("title", "city", "region", "owner__username")


@admin.register(ActivityReview)
class ActivityReviewAdmin(admin.ModelAdmin):
    list_display = ("listing", "reviewer", "rating", "is_hidden", "created_at")
    list_filter = ("is_hidden", "rating")
    search_fields = ("listing__title", "reviewer__username", "body")


@admin.register(ActivitySave)
class ActivitySaveAdmin(admin.ModelAdmin):
    list_display = ("listing", "user", "created_at")
    search_fields = ("listing__title", "user__username")
