from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import JourneyEntryShareView, JourneyQuestionAnswerView, JourneyViewSet

router = DefaultRouter()
router.register(r"", JourneyViewSet, basename="journey")

urlpatterns = [
    path("entries/<int:pk>/share/", JourneyEntryShareView.as_view(), name="journey-entry-share"),
    path("questions/<int:pk>/answers/", JourneyQuestionAnswerView.as_view(), name="journey-question-answer"),
    path("", include(router.urls)),
]
