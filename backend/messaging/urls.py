from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ConversationViewSet, StartOrGetConversationView

router = DefaultRouter()
router.register(r"conversations", ConversationViewSet, basename="conversation")

urlpatterns = [
    path("", include(router.urls)),
    path("start/", StartOrGetConversationView.as_view(), name="conversation-start"),
]
