from django.urls import path

from .views import HighlightMediaUploadView

urlpatterns = [
    path("upload/", HighlightMediaUploadView.as_view(), name="highlight-media-upload"),
]
