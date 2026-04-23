from django.contrib import admin

from .models import FoodVenue


@admin.register(FoodVenue)
class FoodVenueAdmin(admin.ModelAdmin):
    list_display = ("name", "cuisine", "region", "owner")
