from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .platform_intelligence_views import (
    PlatformAnalyticsView,
    PlatformNotificationsView,
    PlatformSettingsView,
    PlatformUserDeleteView,
)
from promotions.views import (
    PlatformPromotionAnalyticsView,
    PlatformPromotionConflictsView,
    PlatformPromotionDetailView,
    PlatformPromotionsView,
)
from .platform_marketplace_views import (
    PlatformBookingDetailView,
    PlatformBookingsView,
    PlatformEmailVerificationView,
    PlatformListingsView,
)
from .platform_views import (
    PlatformActivityView,
    PlatformBusinessDocumentsView,
    PlatformBusinessesView,
    PlatformBusinessVerificationView,
    PlatformOverviewView,
    PlatformUserDetailView,
    PlatformUserUpdateView,
    PlatformUsersView,
)
from reports.views import PlatformModerationContentView, PlatformReportDetailView, PlatformReportsView
from .views import (
    BusinessProfileDetailView,
    BusinessProfileListView,
    CheckUsernameView,
    CreateMyBusinessView,
    MeView,
    MyBusinessDocumentsView,
    MyBusinessesView,
    ProfileUpdateView,
    PublicProfileView,
    RegisterView,
    SubmitBusinessVerificationView,
    ThrottledTokenView,
    UpdateMyBusinessView,
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
    path("me/businesses/create/", CreateMyBusinessView.as_view(), name="my-business-create"),
    path("me/businesses/<int:pk>/", UpdateMyBusinessView.as_view(), name="my-business-update"),
    path("me/businesses/<int:pk>/documents/", MyBusinessDocumentsView.as_view(), name="my-business-documents"),
    path(
        "me/businesses/<int:pk>/submit-verification/",
        SubmitBusinessVerificationView.as_view(),
        name="my-business-submit-verification",
    ),
    path("me/update/", ProfileUpdateView.as_view(), name="me-update"),
    path("admin/overview/", PlatformOverviewView.as_view(), name="platform-overview"),
    path("admin/activity/", PlatformActivityView.as_view(), name="platform-activity"),
    path("admin/users/", PlatformUsersView.as_view(), name="platform-users"),
    path("admin/users/<int:pk>/", PlatformUserDetailView.as_view(), name="platform-user-detail"),
    path("admin/users/<int:pk>/update/", PlatformUserUpdateView.as_view(), name="platform-user-update"),
    path("admin/users/<int:pk>/delete/", PlatformUserDeleteView.as_view(), name="platform-user-delete"),
    path("admin/analytics/", PlatformAnalyticsView.as_view(), name="platform-analytics"),
    path("admin/notifications/", PlatformNotificationsView.as_view(), name="platform-notifications"),
    path("admin/settings/", PlatformSettingsView.as_view(), name="platform-settings"),
    path("admin/promotions/analytics/", PlatformPromotionAnalyticsView.as_view(), name="platform-promotion-analytics"),
    path("admin/promotions/", PlatformPromotionsView.as_view(), name="platform-promotions"),
    path("admin/promotions/conflicts/", PlatformPromotionConflictsView.as_view(), name="platform-promotion-conflicts"),
    path("admin/promotions/<int:pk>/", PlatformPromotionDetailView.as_view(), name="platform-promotion-detail"),
    path("admin/businesses/", PlatformBusinessesView.as_view(), name="platform-businesses"),
    path(
        "admin/businesses/<int:pk>/documents/",
        PlatformBusinessDocumentsView.as_view(),
        name="platform-business-documents",
    ),
    path(
        "admin/businesses/<int:pk>/verification/",
        PlatformBusinessVerificationView.as_view(),
        name="platform-business-verification",
    ),
    path("admin/reports/", PlatformReportsView.as_view(), name="platform-reports"),
    path("admin/reports/<int:pk>/", PlatformReportDetailView.as_view(), name="platform-report-detail"),
    path("admin/moderation/", PlatformModerationContentView.as_view(), name="platform-moderation"),
    path("admin/listings/", PlatformListingsView.as_view(), name="platform-listings"),
    path("admin/bookings/", PlatformBookingsView.as_view(), name="platform-bookings"),
    path(
        "admin/bookings/<str:booking_type>/<int:booking_id>/",
        PlatformBookingDetailView.as_view(),
        name="platform-booking-detail",
    ),
    path("admin/email-verification/", PlatformEmailVerificationView.as_view(), name="platform-email-verification"),
    path(
        "admin/email-verification/<int:pk>/",
        PlatformEmailVerificationView.as_view(),
        name="platform-email-verification-user",
    ),
    path("users/<str:username>/", PublicProfileView.as_view(), name="public-profile"),
    path("businesses/", BusinessProfileListView.as_view(), name="business-list"),
    path("businesses/<int:pk>/", BusinessProfileDetailView.as_view(), name="business-detail"),
]
