from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .provider_views import ProviderActivityListingViewSet
from .views import ActivityListingViewSet

router = DefaultRouter()
router.register(r"listings", ActivityListingViewSet, basename="activity-listing")
router.register(r"provider-listings", ProviderActivityListingViewSet, basename="provider-activity-listing")

urlpatterns = [
    path("", include(router.urls)),
]
