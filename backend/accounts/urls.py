from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .platform_intelligence_views import (
    PlatformAnalyticsView,
    PlatformNotificationsView,
    PlatformSettingsView,
    PlatformUserDeleteView,
    PublicAnnouncementView,
)
from promotions.home_pin_views import (
    PlatformHomePinDetailView,
    PlatformHomePinReorderView,
    PlatformHomePinsView,
)
from promotions.home_story_views import (
    PlatformHomeStoryChannelDetailView,
    PlatformHomeStoryChannelsView,
    PlatformHomeStorySlideDetailView,
    PlatformHomeStorySlideReorderView,
    PlatformHomeStorySlidesView,
)
from promotions.views import (
    PlatformPromotionAnalyticsView,
    PlatformPromotionConflictsView,
    PlatformPromotionDetailView,
    PlatformPromotionsView,
)
from .marketplace_dispute_views import (
    MeDisputeDetailView,
    MeDisputesView,
    PlatformDisputeDetailView,
    PlatformDisputesView,
)
from .seller_trust_views import BusinessTrustView, SellerTrustByUsernameView
from .review_moderation_views import PlatformReviewsView
from .seller_review_reply_views import ProviderReviewReplyView, ProviderReviewsView
from .platform_marketplace_views import (
    PlatformBookingDetailView,
    PlatformBookingsView,
    PlatformEmailVerificationView,
    PlatformFoodListingInspectorView,
    PlatformGuideListingInspectorView,
    PlatformListingsView,
    PlatformPaymentDetailView,
    PlatformPaymentsView,
)
from .platform_views import (
    PlatformActivityView,
    PlatformBusinessDocumentsView,
    PlatformBusinessesView,
    PlatformBusinessVerificationView,
    PlatformOverviewView,
    PlatformUserDetailView,
    PlatformUserProfileView,
    PlatformUserUpdateView,
    PlatformUsersView,
)
from reports.views import PlatformModerationContentView, PlatformReportDetailView, PlatformReportsView
from .journey_creator_questions import MeJourneyQuestionsView
from .provider_listing_questions import ProviderListingQuestionsView
from .views import (
    BecomeProviderView,
    BusinessListingsView,
    BusinessProfileDetailView,
    BusinessProfileListView,
    ChangePasswordView,
    CheckUsernameView,
    CreateMyBusinessView,
    MeView,
    MyBusinessDocumentsView,
    MyBusinessesView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileUpdateView,
    PublicProfileView,
    RegisterView,
    ResendVerificationView,
    SelfDeleteAccountView,
    SubmitBusinessVerificationView,
    ThrottledTokenView,
    UpdateMyBusinessView,
    VerifyEmailView,
)

urlpatterns = [
    path("check-username/", CheckUsernameView.as_view(), name="check-username"),
    path("register/", RegisterView.as_view(), name="register"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="resend-verification"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("token/", ThrottledTokenView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("me/become-provider/", BecomeProviderView.as_view(), name="become-provider"),
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
    path("me/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("me/delete/", SelfDeleteAccountView.as_view(), name="me-delete"),
    path("announcement/", PublicAnnouncementView.as_view(), name="public-announcement"),
    path("me/journey-questions/", MeJourneyQuestionsView.as_view(), name="me-journey-questions"),
    path("provider/listing-questions/", ProviderListingQuestionsView.as_view(), name="provider-listing-questions"),
    path("me/disputes/", MeDisputesView.as_view(), name="me-disputes"),
    path("me/disputes/<int:pk>/", MeDisputeDetailView.as_view(), name="me-dispute-detail"),
    path("admin/overview/", PlatformOverviewView.as_view(), name="platform-overview"),
    path("admin/activity/", PlatformActivityView.as_view(), name="platform-activity"),
    path("admin/users/", PlatformUsersView.as_view(), name="platform-users"),
    path("admin/users/<int:pk>/", PlatformUserDetailView.as_view(), name="platform-user-detail"),
    path("admin/users/<int:pk>/profile/", PlatformUserProfileView.as_view(), name="platform-user-profile"),
    path("admin/users/<int:pk>/update/", PlatformUserUpdateView.as_view(), name="platform-user-update"),
    path("admin/users/<int:pk>/delete/", PlatformUserDeleteView.as_view(), name="platform-user-delete"),
    path("admin/analytics/", PlatformAnalyticsView.as_view(), name="platform-analytics"),
    path("admin/notifications/", PlatformNotificationsView.as_view(), name="platform-notifications"),
    path("admin/settings/", PlatformSettingsView.as_view(), name="platform-settings"),
    path("admin/promotions/analytics/", PlatformPromotionAnalyticsView.as_view(), name="platform-promotion-analytics"),
    path("admin/home-pins/", PlatformHomePinsView.as_view(), name="platform-home-pins"),
    path("admin/home-pins/reorder/", PlatformHomePinReorderView.as_view(), name="platform-home-pins-reorder"),
    path("admin/home-pins/<int:pk>/", PlatformHomePinDetailView.as_view(), name="platform-home-pin-detail"),
    path("admin/home-story-channels/", PlatformHomeStoryChannelsView.as_view(), name="platform-home-story-channels"),
    path(
        "admin/home-story-channels/<str:channel_id>/",
        PlatformHomeStoryChannelDetailView.as_view(),
        name="platform-home-story-channel-detail",
    ),
    path("admin/home-story-slides/", PlatformHomeStorySlidesView.as_view(), name="platform-home-story-slides"),
    path(
        "admin/home-story-slides/reorder/",
        PlatformHomeStorySlideReorderView.as_view(),
        name="platform-home-story-slides-reorder",
    ),
    path(
        "admin/home-story-slides/<int:pk>/",
        PlatformHomeStorySlideDetailView.as_view(),
        name="platform-home-story-slide-detail",
    ),
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
    path(
        "admin/listings/food/<int:listing_id>/inspect/",
        PlatformFoodListingInspectorView.as_view(),
        name="platform-food-listing-inspect",
    ),
    path(
        "admin/listings/guide/<int:listing_id>/inspect/",
        PlatformGuideListingInspectorView.as_view(),
        name="platform-guide-listing-inspect",
    ),
    path("admin/bookings/", PlatformBookingsView.as_view(), name="platform-bookings"),
    path(
        "admin/bookings/<str:booking_type>/<int:booking_id>/",
        PlatformBookingDetailView.as_view(),
        name="platform-booking-detail",
    ),
    path("admin/payments/", PlatformPaymentsView.as_view(), name="platform-payments"),
    path("admin/reviews/", PlatformReviewsView.as_view(), name="platform-reviews"),
    path("provider/reviews/", ProviderReviewsView.as_view(), name="provider-reviews"),
    path(
        "provider/reviews/<str:source>/<int:review_id>/reply/",
        ProviderReviewReplyView.as_view(),
        name="provider-review-reply",
    ),
    path(
        "admin/payments/<str:source>/<int:record_id>/",
        PlatformPaymentDetailView.as_view(),
        name="platform-payment-detail",
    ),
    path("admin/disputes/", PlatformDisputesView.as_view(), name="platform-disputes"),
    path(
        "admin/disputes/<int:pk>/",
        PlatformDisputeDetailView.as_view(),
        name="platform-dispute-detail",
    ),
    path("admin/email-verification/", PlatformEmailVerificationView.as_view(), name="platform-email-verification"),
    path(
        "admin/email-verification/<int:pk>/",
        PlatformEmailVerificationView.as_view(),
        name="platform-email-verification-user",
    ),
    path("users/<str:username>/", PublicProfileView.as_view(), name="public-profile"),
    path(
        "sellers/<str:username>/trust/",
        SellerTrustByUsernameView.as_view(),
        name="seller-trust",
    ),
    path("businesses/", BusinessProfileListView.as_view(), name="business-list"),
    path("businesses/<int:pk>/", BusinessProfileDetailView.as_view(), name="business-detail"),
    path(
        "businesses/<int:pk>/trust/",
        BusinessTrustView.as_view(),
        name="business-trust",
    ),
    path("businesses/<int:pk>/listings/", BusinessListingsView.as_view(), name="business-listings"),
]
