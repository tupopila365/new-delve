from django.contrib import admin

from .models import AccommodationBooking, AccommodationListing


@admin.register(AccommodationListing)
class AccommodationListingAdmin(admin.ModelAdmin):
    list_display = ("title", "property_type", "region", "owner", "price_per_night", "pet_friendly", "rating_avg")


@admin.register(AccommodationBooking)
class AccommodationBookingAdmin(admin.ModelAdmin):
    list_display = ("listing", "guest", "check_in", "status")
