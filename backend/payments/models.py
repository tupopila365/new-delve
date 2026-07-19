"""Stripe-shaped payment simulation (Phase 4) — swap real Stripe later."""

from decimal import Decimal

from django.conf import settings
from django.db import models


class PaymentIntentStatus(models.TextChoices):
    REQUIRES_PAYMENT_METHOD = "requires_payment_method", "Requires payment method"
    REQUIRES_CONFIRMATION = "requires_confirmation", "Requires confirmation"
    PROCESSING = "processing", "Processing"
    SUCCEEDED = "succeeded", "Succeeded"
    CANCELED = "canceled", "Canceled"
    FAILED = "failed", "Failed"


class PaymentTarget(models.TextChoices):
    SHOP_ORDER = "shop_order", "Shop order"
    ACCOMMODATION = "accommodation", "Stay booking"
    GUIDE = "guide", "Guide booking"
    VEHICLE = "vehicle", "Vehicle booking"
    BUS_SEAT = "bus_seat", "Bus seat"
    BUS_SEAT_BULK = "bus_seat_bulk", "Bus seats (bulk)"


class SimulatedPaymentIntent(models.Model):
    """
    Local stand-in for Stripe PaymentIntent.
    Real Stripe later: keep the same fields / webhook shape.
    """

    stripe_id = models.CharField(max_length=64, unique=True, db_index=True)
    client_secret = models.CharField(max_length=128)
    status = models.CharField(
        max_length=32,
        choices=PaymentIntentStatus.choices,
        default=PaymentIntentStatus.REQUIRES_PAYMENT_METHOD,
        db_index=True,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=8, default="nad")
    target_type = models.CharField(max_length=32, choices=PaymentTarget.choices, db_index=True)
    # shop: order_ref string; bookings: numeric id; bulk bus: JSON list in metadata
    target_id = models.CharField(max_length=64, db_index=True)
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="simulated_payment_intents",
    )
    metadata = models.JSONField(default=dict, blank=True)
    last4 = models.CharField(max_length=4, blank=True)
    brand = models.CharField(max_length=32, blank=True, default="visa")
    failure_code = models.CharField(max_length=64, blank=True)
    failure_message = models.CharField(max_length=255, blank=True)
    charge_id = models.CharField(max_length=64, blank=True)
    refunded = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.stripe_id} ({self.status})"

    @property
    def amount_cents(self) -> int:
        return int((self.amount * Decimal("100")).quantize(Decimal("1")))
