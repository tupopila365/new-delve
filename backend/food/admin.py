from django.contrib import admin

from .models import FoodVenue, FoodVenueReview


@admin.register(FoodVenue)
class FoodVenueAdmin(admin.ModelAdmin):
    list_display = ("name", "cuisine", "city", "region", "owner", "is_active")
    list_filter = ("cuisine", "is_active", "region")
    search_fields = ("name", "city", "owner__username")


@admin.register(FoodVenueReview)
class FoodVenueReviewAdmin(admin.ModelAdmin):
    list_display = ("venue", "reviewer", "rating", "created_at")
    raw_id_fields = ("venue", "reviewer")
