from decimal import Decimal

from django.conf import settings
from django.db import models


class ActivityCategory(models.TextChoices):
    DRIVES = "drives", "Drives & scenic tours"
    SAFARI_WILDLIFE = "safari_wildlife", "Safari & wildlife"
    ADVENTURE = "adventure", "Adventure"
    WATER = "water", "Water activities"
    CULTURAL = "cultural", "Cultural experiences"
    WELLNESS = "wellness", "Wellness & nature"
    OTHER = "other", "Other"


class ActivityListing(models.Model):
    """A bookable activity / experience offered by an operator (international)."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activity_listings",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    tagline = models.CharField(max_length=240, blank=True)
    category = models.CharField(
        max_length=32,
        choices=ActivityCategory.choices,
        default=ActivityCategory.OTHER,
    )
    country_code = models.CharField(
        max_length=2,
        blank=True,
        help_text="ISO 3166-1 alpha-2, e.g. NA, ZA, KE.",
    )
    region = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)
    meeting_point = models.CharField(max_length=300, blank=True)
    duration_hours = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        default=Decimal("2.0"),
        help_text="Typical duration in hours.",
    )
    price_from = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        help_text="Starting price per person (or group — see price_note).",
    )
    currency = models.CharField(max_length=3, blank=True, default="")
    price_note = models.CharField(
        max_length=80,
        blank=True,
        help_text="e.g. per person, per group, from",
    )
    max_group_size = models.PositiveSmallIntegerField(null=True, blank=True)
    min_age = models.PositiveSmallIntegerField(null=True, blank=True)
    languages = models.JSONField(default=list, blank=True)
    includes = models.JSONField(default=list, blank=True)
    excludes = models.JSONField(default=list, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    media_gallery = models.JSONField(
        default=list,
        blank=True,
        help_text='Ordered gallery: [{"kind":"image"|"video","src":"url","caption":""}]',
    )
    cover_image = models.TextField(
        blank=True,
        default="",
        help_text="Cover photo or video URL / storage path.",
    )
    cover_kind = models.CharField(
        max_length=16,
        choices=[("image", "Image"), ("video", "Video")],
        default="image",
    )
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal("0"))
    rating_count = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ActivityReview(models.Model):
    """Traveler star rating + written review of an activity."""

    listing = models.ForeignKey(
        ActivityListing,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activity_reviews",
    )
    rating = models.PositiveSmallIntegerField()
    body = models.TextField(blank=True)
    media = models.JSONField(
        default=list,
        blank=True,
        help_text='List of {"url": ..., "kind": "image"|"video"} the reviewer attached.',
    )
    is_hidden = models.BooleanField(default=False, db_index=True)
    moderation_note = models.CharField(max_length=255, blank=True)
    seller_reply = models.TextField(blank=True)
    seller_replied_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name="activity_review_rating_1_5",
            ),
            models.UniqueConstraint(
                fields=["listing", "reviewer"],
                name="activity_review_unique_listing_reviewer",
            ),
        ]

    def __str__(self):
        return f"{self.rating}★ on {self.listing_id} by {self.reviewer_id}"


class ActivitySave(models.Model):
    """Traveller bookmark on an activity listing."""

    listing = models.ForeignKey(
        ActivityListing,
        on_delete=models.CASCADE,
        related_name="user_saves",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activity_saves",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("listing", "user"),
                name="activity_save_listing_user_uniq",
            ),
        ]

    def __str__(self):
        return f"save {self.listing_id} by {self.user_id}"
