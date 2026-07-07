from django.urls import path

from .views import TagDetailView, TagSuggestView, TagTrendingView

urlpatterns = [
    path("suggest/", TagSuggestView.as_view(), name="tag-suggest"),
    path("trending/", TagTrendingView.as_view(), name="tag-trending"),
    path("<slug>/", TagDetailView.as_view(), name="tag-detail"),
]
