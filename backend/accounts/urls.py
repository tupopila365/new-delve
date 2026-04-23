from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CheckUsernameView,
    MeView,
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
    path("me/update/", ProfileUpdateView.as_view(), name="me-update"),
    path("users/<str:username>/", PublicProfileView.as_view(), name="public-profile"),
]
