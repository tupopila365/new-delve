from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CommunityGroupViewSet

router = DefaultRouter()
router.register(r"groups", CommunityGroupViewSet, basename="community-group")

urlpatterns = [
    path("", include(router.urls)),
]
