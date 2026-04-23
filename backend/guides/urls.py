from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import GuideBookingViewSet, TourGuideProfileViewSet

router = DefaultRouter()
router.register(r"profiles", TourGuideProfileViewSet, basename="guide-profile")
router.register(r"bookings", GuideBookingViewSet, basename="guide-booking")

urlpatterns = [path("", include(router.urls))]
