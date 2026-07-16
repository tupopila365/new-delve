from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .analytics_views import GuideProviderAnalyticsView
from .provider_booking_views import ProviderGuideBookingViewSet
from .provider_views import ProviderGuideProfileView
from .views import GuideBookingViewSet, TourGuideProfileViewSet

router = DefaultRouter()
router.register(r"profiles", TourGuideProfileViewSet, basename="guide-profile")
router.register(r"bookings", GuideBookingViewSet, basename="guide-booking")
router.register(r"provider-bookings", ProviderGuideBookingViewSet, basename="provider-guide-booking")

urlpatterns = [
    path("provider-profile/", ProviderGuideProfileView.as_view(), name="provider-guide-profile"),
    path("provider-analytics/", GuideProviderAnalyticsView.as_view(), name="guide-provider-analytics"),
    path("", include(router.urls)),
]
