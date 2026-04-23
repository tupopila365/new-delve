from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AccommodationBookingViewSet, AccommodationListingViewSet

router = DefaultRouter()
router.register(r"listings", AccommodationListingViewSet, basename="accommodation-listing")
router.register(r"bookings", AccommodationBookingViewSet, basename="accommodation-booking")

urlpatterns = [path("", include(router.urls))]
