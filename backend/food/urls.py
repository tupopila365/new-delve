from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .analytics_views import FoodProviderAnalyticsView
from .provider_views import ProviderFoodVenueViewSet
from .reservation_views import FoodReservationViewSet, ProviderFoodReservationViewSet
from .views import FoodQuestionAnswerView, FoodVenueViewSet

router = DefaultRouter()
router.register(r"venues", FoodVenueViewSet, basename="food-venue")
router.register(r"provider-venues", ProviderFoodVenueViewSet, basename="provider-food-venue")
router.register(r"reservations", FoodReservationViewSet, basename="food-reservation")
router.register(r"provider-reservations", ProviderFoodReservationViewSet, basename="provider-food-reservation")

urlpatterns = [
    path("provider-analytics/", FoodProviderAnalyticsView.as_view(), name="food-provider-analytics"),
    path("questions/<int:pk>/answers/", FoodQuestionAnswerView.as_view(), name="food-question-answer"),
    path("", include(router.urls)),
]