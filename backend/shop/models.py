from decimal import Decimal

from django.conf import settings
from django.db import models


class ShopCategory(models.TextChoices):
    SOUVENIRS = "souvenirs", "Souvenirs & gifts"
    CRAFTS = "crafts", "Handmade crafts"
    JEWELLERY = "jewellery", "Jewellery"
    CLOTHING = "clothing", "Clothing & textiles"
    ART = "art", "Art & prints"
    BOOKS_MAPS = "books_maps", "Books & maps"
    LOCAL_FOOD = "local_food", "Local food & pantry"
    GEAR = "gear", "Safari & travel gear"
    OTHER = "other", "Other"


class ShopProduct(models.Model):
    """Tourism retail product — pickup-first, message-to-order."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shop_products",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    tagline = models.CharField(max_length=240, blank=True)
    category = models.CharField(
        max_length=32,
        choices=ShopCategory.choices,
        default=ShopCategory.SOUVENIRS,
    )
    region = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)
    pickup_address = models.CharField(
        max_length=300,
        blank=True,
        help_text="Where travellers can collect — market stall, shop, lodge desk, etc.",
    )
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    price_note = models.CharField(
        max_length=80,
        blank=True,
        help_text="e.g. per item, from, per set",
    )
    in_stock = models.BooleanField(default=True)
    pickup_available = models.BooleanField(default=True)
    lodge_delivery = models.BooleanField(
        default=False,
        help_text="Can deliver to a lodge or hotel in the area.",
    )
    made_in_namibia = models.BooleanField(default=False)
    artisan_name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    photos = models.JSONField(default=list, blank=True)
    cover_image = models.TextField(blank=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
