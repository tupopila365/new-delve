from django.conf import settings
from django.db import models
from django.utils import timezone


class PromotionPlacement(models.TextChoices):
    HOMEPAGE_STAYS = "homepage_stays", "Homepage — Featured stays"
    HOMEPAGE_GUIDES = "homepage_guides", "Homepage — Featured guides"
    HOMEPAGE_FOOD = "homepage_food", "Homepage — Featured food"
    HOMEPAGE_EVENTS = "homepage_events", "Homepage — Featured events"
    HOMEPAGE_TRANSPORT = "homepage_transport", "Homepage — Featured transport"
    CATEGORY_SPOTLIGHT = "category_spotlight", "Category list — Hero spotlight"
    DELVERS_FEED = "delvers_feed", "Delvers feed — Sponsored injection"
    COMMUNITY_FEED = "community_feed", "Community feed — Sponsored injection"


class PromotionTargetType(models.TextChoices):
    ACCOMMODATION = "accommodation", "Stay listing"
    GUIDE = "guide", "Guide profile"
    FOOD = "food", "Food venue"
    EVENT = "event", "Event"
    VEHICLE = "vehicle", "Vehicle rental"
    BUSINESS = "business", "Business profile"
    POST = "post", "Delvers post"


class PromotionStatus(models.TextChoices):
    PENDING_PAYMENT = "pending_payment", "Pending payment"
    REQUESTED = "requested", "Requested"
    SCHEDULED = "scheduled", "Scheduled"
    ACTIVE = "active", "Active"
    EXPIRED = "expired", "Expired"
    REJECTED = "rejected", "Rejected"
    CANCELLED = "cancelled", "Cancelled"
    REFUNDED = "refunded", "Refunded"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PAID = "paid", "Paid"
    REFUNDED = "refunded", "Refunded"
    FAILED = "failed", "Failed"


DEFAULT_PARTNER_LABEL = "Featured Partner"
DEFAULT_SPONSORED_LABEL = "Sponsored"


class PromotionProduct(models.Model):
    """Purchasable promotion package."""

    slug = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=255)
    placement = models.CharField(max_length=40, choices=PromotionPlacement.choices)
    region = models.CharField(max_length=120, blank=True, help_text="Blank = national reach.")
    duration_days = models.PositiveSmallIntegerField(default=7)
    price_cents = models.PositiveIntegerField()
    currency = models.CharField(max_length=8, default="NAD")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["placement", "region", "duration_days"]

    def __str__(self):
        return self.name


class PromotionCampaign(models.Model):
    """Featured placement campaign — admin-created or provider-purchased."""

    placement = models.CharField(max_length=40, choices=PromotionPlacement.choices)
    target_type = models.CharField(max_length=32, choices=PromotionTargetType.choices)
    target_id = models.CharField(max_length=64)
    target_label = models.CharField(max_length=255, blank=True)
    region = models.CharField(
        max_length=120,
        blank=True,
        help_text="Leave blank for national (all regions).",
    )
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    status = models.CharField(
        max_length=16,
        choices=PromotionStatus.choices,
        default=PromotionStatus.SCHEDULED,
    )
    priority = models.PositiveSmallIntegerField(default=0)
    label = models.CharField(max_length=64, default=DEFAULT_PARTNER_LABEL)
    admin_notes = models.TextField(blank=True)
    provider_notes = models.TextField(blank=True, help_text="Message from provider when requesting.")
    rejection_reason = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="promotion_campaigns_created",
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="promotion_requests",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="promotion_reviews",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    impressions = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)
    listing_opens = models.PositiveIntegerField(default=0)
    product = models.ForeignKey(
        PromotionProduct,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="campaigns",
    )
    amount_cents = models.PositiveIntegerField(default=0)
    currency = models.CharField(max_length=8, default="NAD", blank=True)
    payment_status = models.CharField(
        max_length=16,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        blank=True,
    )
    payment_provider = models.CharField(max_length=16, blank=True)
    payment_ref = models.CharField(max_length=64, blank=True)
    receipt_number = models.CharField(max_length=32, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    refund_amount_cents = models.PositiveIntegerField(default=0)
    refund_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-priority", "-starts_at"]
        indexes = [
            models.Index(fields=["placement", "status", "-starts_at"]),
            models.Index(fields=["target_type", "target_id"]),
        ]

    def __str__(self):
        return f"{self.placement} — {self.target_type}:{self.target_id}"

    def refresh_status(self) -> None:
        now = timezone.now()
        frozen = (
            PromotionStatus.CANCELLED,
            PromotionStatus.REJECTED,
            PromotionStatus.REQUESTED,
            PromotionStatus.PENDING_PAYMENT,
            PromotionStatus.REFUNDED,
        )
        if self.status in frozen:
            return
        if now > self.ends_at:
            self.status = PromotionStatus.EXPIRED
        elif now >= self.starts_at:
            self.status = PromotionStatus.ACTIVE
        else:
            self.status = PromotionStatus.SCHEDULED

    def save(self, *args, **kwargs):
        skip_refresh = (
            PromotionStatus.CANCELLED,
            PromotionStatus.REJECTED,
            PromotionStatus.REQUESTED,
            PromotionStatus.PENDING_PAYMENT,
            PromotionStatus.REFUNDED,
        )
        if self.status not in skip_refresh:
            self.refresh_status()
        super().save(*args, **kwargs)
