from decimal import Decimal

from django.conf import settings
from django.db import models

from accounts.marketplace_payout import PayoutStatus


class AccommodationListing(models.Model):
    class PropertyType(models.TextChoices):
        HOTEL = "hotel", "Hotel"
        GUESTHOUSE = "guesthouse", "Guest house"
        BED_AND_BREAKFAST = "bed_and_breakfast", "Bed & breakfast"
        APARTMENT = "apartment", "Apartment / flat"
        LODGE = "lodge", "Lodge"
        HOSTEL = "hostel", "Hostel"
        VILLA = "villa", "Villa / house"
        RESORT = "resort", "Resort"
        CAMPING_GLAMPING = "camping_glamping", "Camping / glamping"
        OTHER = "other", "Other"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="accommodation_listings",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    property_type = models.CharField(
        max_length=32,
        choices=PropertyType.choices,
        default=PropertyType.GUESTHOUSE,
        db_index=True,
    )
    pet_friendly = models.BooleanField(default=False, db_index=True)
    wifi = models.BooleanField(default=False, db_index=True)
    parking = models.BooleanField(default=False, db_index=True)
    pool = models.BooleanField(default=False, db_index=True)
    kitchen = models.BooleanField(default=False, db_index=True)
    breakfast = models.BooleanField(default=False, db_index=True)
    region = models.CharField(max_length=120)
    city = models.CharField(max_length=120, blank=True)
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2)
    max_guests = models.PositiveSmallIntegerField(default=2)
    bedrooms = models.PositiveSmallIntegerField(default=1)
    amenities = models.JSONField(default=list, blank=True)
    cover_image = models.TextField(
        blank=True,
        default="",
        help_text="Cover photo URL or /media/ relative path (provider URL-friendly).",
    )
    media_gallery = models.JSONField(
        default=list,
        blank=True,
        help_text='Ordered gallery: [{"kind":"image"|"video","src":"path or URL"}]',
    )
    check_in_from = models.CharField(
        max_length=12,
        blank=True,
        default="14:00",
        help_text="Earliest check-in (24h), e.g. 14:00",
    )
    check_out_until = models.CharField(
        max_length=12,
        blank=True,
        default="10:00",
        help_text="Latest check-out (24h), e.g. 10:00",
    )
    house_rules = models.TextField(blank=True, help_text="One rule per line is supported in the UI.")
    cancellation_policy = models.TextField(blank=True)
    faqs = models.JSONField(
        default=list,
        blank=True,
        help_text='FAQ: [{"question": "...", "answer": "..."}]',
    )
    guest_reviews = models.JSONField(
        default=list,
        blank=True,
        help_text='Reviews: [{"name": "...", "place": "...", "rating": 4.5, "body": "..."}]',
    )
    room_types = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "Room/unit categories. Each item supports: name (required), description, "
            "max_guests, bedrooms, bed_summary, price_per_night, compare_at_price "
            "(strike-through 'was' price for a sale), badge (short sale/special label), "
            "featured (bool), image (cover URL), images (gallery URLs)."
        ),
    )
    rating_avg = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Average guest rating 0–5 (0 until the stay has reviews).",
    )
    rating_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def _sync_amenity_flags_from_json(self):
        tags = {str(x).lower().strip() for x in (self.amenities or []) if x is not None}
        self.wifi = "wifi" in tags
        self.parking = "parking" in tags
        self.pool = any("pool" in t for t in tags)
        self.kitchen = "kitchen" in tags
        self.breakfast = "breakfast" in tags

    def save(self, *args, **kwargs):
        self._sync_amenity_flags_from_json()
        super().save(*args, **kwargs)


class AccommodationListingLike(models.Model):
    """A user's like (heart) on a stay listing — used for public like counts."""

    listing = models.ForeignKey(
        AccommodationListing,
        on_delete=models.CASCADE,
        related_name="user_likes",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="accommodation_listing_likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("listing", "user"),
                name="accommodation_listing_like_listing_user_uniq",
            ),
        ]


class AccommodationListingSave(models.Model):
    """A user's bookmark on a stay listing."""

    listing = models.ForeignKey(
        AccommodationListing,
        on_delete=models.CASCADE,
        related_name="user_saves",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="accommodation_listing_saves",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("listing", "user"),
                name="accommodation_listing_save_listing_user_uniq",
            ),
        ]


class BookingStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    CONFIRMED = "confirmed", "Confirmed"
    CHECKED_IN = "checked_in", "Checked in"
    CHECKED_OUT = "checked_out", "Checked out"
    CANCELLED = "cancelled", "Cancelled"
    REFUNDED = "refunded", "Refunded"


class AccommodationBooking(models.Model):
    listing = models.ForeignKey(
        AccommodationListing,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="accommodation_bookings",
    )
    check_in = models.DateField()
    check_out = models.DateField()
    guests = models.PositiveSmallIntegerField(default=1)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
    )
    mock_payment_ref = models.CharField(max_length=64, blank=True)
    platform_fee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    seller_payout = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    payout_status = models.CharField(
        max_length=20,
        choices=PayoutStatus.choices,
        default=PayoutStatus.NONE,
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    payout_released_at = models.DateTimeField(null=True, blank=True)
    special_requests = models.TextField(blank=True)
    room_type_name = models.CharField(
        max_length=200,
        blank=True,
        help_text="Selected room/unit category from the listing's room_types JSON, if any.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class AccommodationReview(models.Model):
    listing = models.ForeignKey(
        AccommodationListing,
        on_delete=models.CASCADE,
        related_name="traveler_reviews",
    )
    booking = models.OneToOneField(
        AccommodationBooking,
        on_delete=models.CASCADE,
        related_name="review",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="accommodation_reviews",
    )
    rating = models.PositiveSmallIntegerField()
    body = models.TextField(blank=True)
    is_hidden = models.BooleanField(default=False, db_index=True)
    moderation_note = models.CharField(max_length=255, blank=True)
    seller_reply = models.TextField(blank=True)
    seller_replied_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name="accommodation_review_rating_1_5",
            ),
        ]
