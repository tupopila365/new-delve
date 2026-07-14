from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AccommodationStoriesFeedView,
    CommentAcceptView,
    CommentDislikeView,
    CommentHeartView,
    CommentHelpfulView,
    DelversFeedView,
    DelversHighlightsView,
    DelversHashtagRingsView,
    DelversTagFollowToggleView,
    FeedView,
    FollowViewSet,
    MediaSignView,
    PostViewSet,
    UserFollowersView,
    UserFollowingView,
    UserFollowToggleView,
    UserPublicPostsView,
)

router = DefaultRouter()
router.register(r"posts", PostViewSet, basename="post")
router.register(r"follows", FollowViewSet, basename="follow")

urlpatterns = [
    path("feed/", FeedView.as_view(), name="feed"),
    path("media/sign/", MediaSignView.as_view(), name="media-sign"),
    path("accommodation-stories/", AccommodationStoriesFeedView.as_view(), name="accommodation-stories"),
    path("delvers/", DelversFeedView.as_view(), name="delvers-feed"),
    path("delvers/highlights/", DelversHighlightsView.as_view(), name="delvers-highlights"),
    path("delvers/hashtag-rings/", DelversHashtagRingsView.as_view(), name="delvers-hashtag-rings"),
    path("delvers/tags/<str:slug>/follow/", DelversTagFollowToggleView.as_view(), name="delvers-tag-follow-toggle"),
    path("comments/<int:pk>/accept/", CommentAcceptView.as_view(), name="comment-accept"),
    path("comments/<int:pk>/helpful/", CommentHelpfulView.as_view(), name="comment-helpful"),
    path("comments/<int:pk>/dislike/", CommentDislikeView.as_view(), name="comment-dislike"),
    path("comments/<int:pk>/heart/", CommentHeartView.as_view(), name="comment-heart"),
    path("users/<str:username>/posts/", UserPublicPostsView.as_view(), name="user-posts"),
    path("users/<str:username>/follow/", UserFollowToggleView.as_view(), name="user-follow-toggle"),
    path("users/<str:username>/followers/", UserFollowersView.as_view(), name="user-followers"),
    path("users/<str:username>/following/", UserFollowingView.as_view(), name="user-following"),
    path("", include(router.urls)),
]
