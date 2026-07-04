from django.urls import path

from config.views_home import HomeStoriesView

urlpatterns = [
    path("stories/", HomeStoriesView.as_view(), name="home-stories"),
]
