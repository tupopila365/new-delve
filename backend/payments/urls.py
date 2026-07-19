from django.urls import path

from payments.views import (
    PaymentIntentConfirmView,
    PaymentIntentCreateView,
    PaymentIntentDetailView,
    PaymentTestCardsView,
    PaymentWebhookSimulateView,
    PlatformPaymentIntentDetailView,
    PlatformPaymentIntentListView,
)

urlpatterns = [
    path("intents/", PaymentIntentCreateView.as_view(), name="payment-intent-create"),
    path("intents/<str:stripe_id>/", PaymentIntentDetailView.as_view(), name="payment-intent-detail"),
    path(
        "intents/<str:stripe_id>/confirm/",
        PaymentIntentConfirmView.as_view(),
        name="payment-intent-confirm",
    ),
    path("webhooks/simulate/", PaymentWebhookSimulateView.as_view(), name="payment-webhook-simulate"),
    path("test-cards/", PaymentTestCardsView.as_view(), name="payment-test-cards"),
    path("admin/intents/", PlatformPaymentIntentListView.as_view(), name="platform-payment-intents"),
    path(
        "admin/intents/<str:stripe_id>/",
        PlatformPaymentIntentDetailView.as_view(),
        name="platform-payment-intent-detail",
    ),
]
