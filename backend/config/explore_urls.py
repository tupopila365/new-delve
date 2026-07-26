from django.urls import path

from config.views_explore import PlaceSignalView, RecommendedPlacesView

urlpatterns = [
    path("recommended-places/", RecommendedPlacesView.as_view(), name="explore-recommended-places"),
    path("place-signals/", PlaceSignalView.as_view(), name="explore-place-signals"),
]
