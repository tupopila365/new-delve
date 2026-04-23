from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FoodVenueViewSet

router = DefaultRouter()
router.register(r"venues", FoodVenueViewSet, basename="food-venue")

urlpatterns = [path("", include(router.urls))]
