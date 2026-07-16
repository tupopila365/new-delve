from decimal import Decimal

from django.conf import settings
from django.db import models

from accommodation.models import BookingStatus


class CuisineType(models.TextChoices):
    LOCAL = "local", "Local / Namibian"
    GRILL = "grill", "Grill & steak"
    SEAFOOD = "seafood", "Seafood"
    CAFE = "cafe", "Café"
    BAKERY = "bakery", "Bakery"
    PIZZA = "pizza", "Pizza"
    ASIAN = "asian", "Asian"
    FAST_FOOD = "fast_food", "Fast food"
    BAR = "bar", "Bar & nightlife"
    VEGAN = "vegan", "Vegan / vegetarian"
    INTERNATIONAL = "international", "International"
    OTHER = "other", "Other"


class FoodVenue(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="food_venues",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    tagline = models.CharField(max_length=240, blank=True)
    popular_dish = models.CharField(max_length=160, blank=True)
    cuisine = models.CharField(
        max_length=32,
        choices=CuisineType.choices,
        default=CuisineType.OTHER,
    )
    region = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)
    address = models.CharField(max_length=300, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    google_place_id = models.CharField(max_length=255, blank=True)
    formatted_address = models.CharField(max_length=500, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    website = models.URLField(blank=True)
    opening_hours = models.TextField(
        blank=True,
        help_text="One line per day or range, e.g. Mon–Fri 08:00–17:00",
    )
    opening_hours_json = models.JSONField(
        default=list,
        blank=True,
        help_text='Structured weekly hours: [{"day":"mon","open":true,"opens":"08:00","closes":"17:00"}]',
    )
    closes_at = models.CharField(
        max_length=40,
        blank=True,
        help_text="Short label for list cards, e.g. 9 PM",
    )
    price_level = models.PositiveSmallIntegerField(
        default=2,
        help_text="1=budget, 4=fine dining",
    )
    dine_in = models.BooleanField(default=True)
    takeaway = models.BooleanField(default=False)
    delivery = models.BooleanField(default=False)
    reservations = models.BooleanField(default=False)
    is_open = models.BooleanField(null=True, blank=True)
    amenities = models.JSONField(
        default=list,
        blank=True,
        help_text='Extra amenity labels, e.g. ["Outdoor seating", "Card accepted"]',
    )
    photos = models.JSONField(
        default=list,
        blank=True,
        help_text='[{"id":1,"image":"url","caption":"","category":"food","is_cover":true}]',
    )
    venue_stories = models.JSONField(
        default=list,
        blank=True,
        help_text="Provider highlight channels for story rings",
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
        help_text="Whether cover_image is a still or a short video.",
    )
    rating_avg = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Average visitor rating 0–5 (0 until the venue has reviews).",
    )
    rating_count = models.PositiveIntegerField(default=0)
    guest_reviews = models.JSONField(
        default=list,
        blank=True,
        help_text='Host-seeded reviews: [{"name": "...", "place": "...", "rating": 4.5, "body": "..."}]',
    )
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class FoodReservation(models.Model):
    venue = models.ForeignKey(
        FoodVenue,
        on_delete=models.CASCADE,
        related_name="table_reservations",
    )
    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="food_reservations",
    )
    reserved_for = models.DateTimeField()
    party_size = models.PositiveSmallIntegerField(default=2)
    special_requests = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-reserved_for", "-created_at"]

    def __str__(self):
        return f"{self.venue.name} — {self.guest_id} @ {self.reserved_for}"


class FoodVenueSave(models.Model):
    """Traveller bookmark on a food venue."""

    venue = models.ForeignKey(
        FoodVenue,
        on_delete=models.CASCADE,
        related_name="user_saves",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="food_venue_saves",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("venue", "user"),
                name="food_venue_save_venue_user_uniq",
            ),
        ]


class FoodVenueLike(models.Model):
    """Traveller like on a food venue."""

    venue = models.ForeignKey(
        FoodVenue,
        on_delete=models.CASCADE,
        related_name="user_likes",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="food_venue_likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("venue", "user"),
                name="food_venue_like_venue_user_uniq",
            ),
        ]


class FoodVenueReview(models.Model):
    venue = models.ForeignKey(
        FoodVenue,
        on_delete=models.CASCADE,
        related_name="traveler_reviews",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="food_venue_reviews",
    )
    reservation = models.ForeignKey(
        FoodReservation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="review",
    )
    rating = models.PositiveSmallIntegerField()
    body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name="food_venue_review_rating_1_5",
            ),
            models.UniqueConstraint(
                fields=["venue", "reviewer"],
                name="food_venue_review_one_per_user",
            ),
        ]
