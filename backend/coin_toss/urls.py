from django.urls import path

from .views import (
    CoinTossView,
    FlagLocationView,
    SavedTossesView,
    SaveLocationView,
    TossLocationListView,
    VoteLocationView,
)

urlpatterns = [
    path("toss/", CoinTossView.as_view(), name="coin-toss"),
    path("locations/", TossLocationListView.as_view(), name="coin-toss-locations"),
    path("saved/", SavedTossesView.as_view(), name="coin-toss-saved"),
    path(
        "locations/<int:location_id>/vote/",
        VoteLocationView.as_view(),
        name="coin-toss-vote",
    ),
    path(
        "locations/<int:location_id>/save/",
        SaveLocationView.as_view(),
        name="coin-toss-save",
    ),
    path(
        "locations/<int:location_id>/flag/",
        FlagLocationView.as_view(),
        name="coin-toss-flag",
    ),
]
