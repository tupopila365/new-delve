from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AccommodationBookingViewSet,
    AccommodationListingViewSet,
    AccommodationProviderBookingViewSet,
    AccommodationProviderListingViewSet,
)

router = DefaultRouter()
router.register(r"listings", AccommodationListingViewSet, basename="accommodation-listing")
router.register(r"bookings", AccommodationBookingViewSet, basename="accommodation-booking")
router.register(
    r"provider-listings",
    AccommodationProviderListingViewSet,
    basename="accommodation-provider-listing",
)
router.register(
    r"provider-bookings",
    AccommodationProviderBookingViewSet,
    basename="accommodation-provider-booking",
)

urlpatterns = [path("", include(router.urls))]
