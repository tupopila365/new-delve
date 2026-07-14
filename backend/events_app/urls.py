from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    EventBookingViewSet,
    EventCategoryFollowListView,
    EventCategoryFollowToggleView,
    EventCommentHelpfulView,
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
    path("comments/<int:pk>/helpful/", EventCommentHelpfulView.as_view(), name="event-comment-helpful"),
    path("category-follows/", EventCategoryFollowListView.as_view(), name="event-category-follows"),
    path(
        "categories/<str:category>/follow/",
        EventCategoryFollowToggleView.as_view(),
        name="event-category-follow-toggle",
    ),
    path("", include(router.urls)),
]
