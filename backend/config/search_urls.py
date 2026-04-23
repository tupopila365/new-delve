from django.urls import path

from config.views_search import UnifiedSearchView

urlpatterns = [
    path("", UnifiedSearchView.as_view(), name="unified-search"),
]
