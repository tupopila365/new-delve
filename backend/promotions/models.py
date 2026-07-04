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
    BUS_TRIP = "bus_trip", "Bus trip"
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


HOMEPAGE_PIN_PLACEMENTS = frozenset(
    {
        PromotionPlacement.HOMEPAGE_STAYS,
        PromotionPlacement.HOMEPAGE_GUIDES,
        PromotionPlacement.HOMEPAGE_FOOD,
        PromotionPlacement.HOMEPAGE_EVENTS,
        PromotionPlacement.HOMEPAGE_TRANSPORT,
    }
)


class HomePin(models.Model):
    """Editorial homepage pin — free Admin override, ordered above paid promos."""

    placement = models.CharField(max_length=40, choices=PromotionPlacement.choices, db_index=True)
    target_type = models.CharField(max_length=32, choices=PromotionTargetType.choices)
    target_id = models.CharField(max_length=64)
    target_label = models.CharField(max_length=255, blank=True)
    partner_label = models.CharField(max_length=80, blank=True, default="Featured")
    region = models.CharField(max_length=120, blank=True, help_text="Blank = national.")
    sort_order = models.PositiveSmallIntegerField(default=0, db_index=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="home_pins_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["placement", "sort_order", "id"]
        indexes = [
            models.Index(fields=["placement", "is_active", "sort_order"]),
        ]

    def __str__(self):
        return f"Pin {self.placement} — {self.target_type}:{self.target_id}"


HOME_STORY_CHANNEL_IDS = ("stays", "go", "live", "eat", "tours", "pins")


class HomeStorySourceType(models.TextChoices):
    POST = "post", "Social post"
    ACCOMMODATION = "accommodation", "Stay listing"
    GUIDE = "guide", "Guide profile"
    FOOD = "food", "Food venue"
    EVENT = "event", "Event"
    VEHICLE = "vehicle", "Vehicle rental"
    BUS_TRIP = "bus_trip", "Bus trip"
    CUSTOM = "custom", "Custom media URL"


class HomeStoryChannelConfig(models.Model):
    """Per-channel settings for home highlights (auto-fill vs editorial-only)."""

    channel_id = models.CharField(max_length=20, unique=True, db_index=True)
    auto_fill = models.BooleanField(
        default=True,
        help_text="When on, live content fills after editorial slides.",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="home_story_channels_updated",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["channel_id"]

    def __str__(self):
        return f"Story channel {self.channel_id} (auto_fill={self.auto_fill})"


class HomeStorySlide(models.Model):
    """Admin-curated slide for a home highlights channel."""

    channel_id = models.CharField(max_length=20, db_index=True)
    source_type = models.CharField(max_length=32, choices=HomeStorySourceType.choices)
    target_id = models.CharField(max_length=64, blank=True)
    target_label = models.CharField(max_length=255, blank=True)
    headline = models.CharField(max_length=200, blank=True)
    sub = models.CharField(max_length=255, blank=True)
    cta_path = models.CharField(max_length=255, blank=True)
    cta_label = models.CharField(max_length=80, blank=True)
    media_url = models.URLField(max_length=500, blank=True, help_text="Required for custom slides; optional override.")
    media_kind = models.CharField(
        max_length=10,
        default="image",
        choices=[("image", "Image"), ("video", "Video")],
    )
    sort_order = models.PositiveSmallIntegerField(default=0, db_index=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="home_story_slides_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["channel_id", "sort_order", "id"]
        indexes = [
            models.Index(fields=["channel_id", "is_active", "sort_order"]),
        ]

    def __str__(self):
        return f"Story slide {self.channel_id} — {self.source_type}:{self.target_id or 'custom'}"

