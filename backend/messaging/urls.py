from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ConversationViewSet,
    MessageBlockDetailView,
    MessageBlockListCreateView,
    StartOrGetConversationView,
    UnreadCountView,
)

router = DefaultRouter()
router.register(r"conversations", ConversationViewSet, basename="conversation")

urlpatterns = [
    path("", include(router.urls)),
    path("start/", StartOrGetConversationView.as_view(), name="conversation-start"),
    path("unread-count/", UnreadCountView.as_view(), name="messaging-unread-count"),
    path("blocks/", MessageBlockListCreateView.as_view(), name="messaging-blocks"),
    path("blocks/<int:user_id>/", MessageBlockDetailView.as_view(), name="messaging-block-detail"),
]
