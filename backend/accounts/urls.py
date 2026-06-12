from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .platform_views import (
    PlatformBusinessesView,
    PlatformBusinessVerificationView,
    PlatformOverviewView,
    PlatformUsersView,
)
from .views import (
    BusinessProfileDetailView,
    BusinessProfileListView,
    CheckUsernameView,
    MeView,
    MyBusinessesView,
    ProfileUpdateView,
    PublicProfileView,
    RegisterView,
    ThrottledTokenView,
    VerifyEmailView,
)

urlpatterns = [
    path("check-username/", CheckUsernameView.as_view(), name="check-username"),
    path("register/", RegisterView.as_view(), name="register"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("token/", ThrottledTokenView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("me/businesses/", MyBusinessesView.as_view(), name="my-businesses"),
    path("me/update/", ProfileUpdateView.as_view(), name="me-update"),
    path("admin/overview/", PlatformOverviewView.as_view(), name="platform-overview"),
    path("admin/users/", PlatformUsersView.as_view(), name="platform-users"),
    path("admin/businesses/", PlatformBusinessesView.as_view(), name="platform-businesses"),
    path(
        "admin/businesses/<int:pk>/verification/",
        PlatformBusinessVerificationView.as_view(),
        name="platform-business-verification",
    ),
    path("users/<str:username>/", PublicProfileView.as_view(), name="public-profile"),
    path("businesses/", BusinessProfileListView.as_view(), name="business-list"),
    path("businesses/<int:pk>/", BusinessProfileDetailView.as_view(), name="business-detail"),
]
