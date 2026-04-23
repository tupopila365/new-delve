from decimal import Decimal

from django.conf import settings
from django.db import models


class CuisineType(models.TextChoices):
    LOCAL = "local", "Local / Namibian"
    GRILL = "grill", "Grill & steak"
    SEAFOOD = "seafood", "Seafood"
    VEGAN = "vegan", "Vegan / vegetarian"
    CAFE = "cafe", "Café & bakery"
    BAR = "bar", "Bar & nightlife"
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
    cuisine = models.CharField(
        max_length=32,
        choices=CuisineType.choices,
        default=CuisineType.OTHER,
    )
    region = models.CharField(max_length=120)
    city = models.CharField(max_length=120, blank=True)
    price_level = models.PositiveSmallIntegerField(
        default=2,
        help_text="1=budget, 4=fine dining",
    )
    cover_image = models.ImageField(upload_to="food/", blank=True, null=True)
    rating_avg = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal("4.50"),
        help_text="Average visitor rating 0–5",
    )
    rating_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
