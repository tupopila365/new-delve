from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    EventBookingViewSet,
    EventProviderBookingViewSet,
    EventQuestionAnswerView,
    EventRecurrenceTemplateViewSet,
    EventViewSet,
)

router = DefaultRouter()
router.register(r"bookings", EventBookingViewSet, basename="event-booking")
router.register(r"provider-bookings", EventProviderBookingViewSet, basename="event-provider-booking")
router.register(r"templates", EventRecurrenceTemplateViewSet, basename="event-template")
router.register(r"", EventViewSet, basename="event")

urlpatterns = [
    path("questions/<int:pk>/answers/", EventQuestionAnswerView.as_view(), name="event-question-answer"),
    path("", include(router.urls)),
]
