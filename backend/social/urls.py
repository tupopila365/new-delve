from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AccommodationStoriesFeedView,
    DelversFeedView,
    FeedView,
    FollowViewSet,
    PostViewSet,
    UserPublicPostsView,
)

router = DefaultRouter()
router.register(r"posts", PostViewSet, basename="post")
router.register(r"follows", FollowViewSet, basename="follow")

urlpatterns = [
    path("feed/", FeedView.as_view(), name="feed"),
    path("accommodation-stories/", AccommodationStoriesFeedView.as_view(), name="accommodation-stories"),
    path("delvers/", DelversFeedView.as_view(), name="delvers-feed"),
    path("users/<str:username>/posts/", UserPublicPostsView.as_view(), name="user-posts"),
    path("", include(router.urls)),
]
