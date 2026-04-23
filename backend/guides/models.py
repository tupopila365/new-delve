from decimal import Decimal

from django.conf import settings
from django.db import models


class TourGuideProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tour_guide_profile",
    )
    headline = models.CharField(max_length=200)
    bio = models.TextField(blank=True)
    languages = models.JSONField(default=list, blank=True)
    regions = models.JSONField(default=list, blank=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    photo = models.ImageField(upload_to="guides/", blank=True, null=True)
    rating_avg = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal("4.80"),
        help_text="Average client rating 0–5",
    )
    rating_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.headline


class GuideBooking(models.Model):
    guide = models.ForeignKey(
        TourGuideProfile,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="guide_bookings",
    )
    date = models.DateField()
    notes = models.TextField(blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    mock_payment_ref = models.CharField(max_length=64, blank=True)
    status = models.CharField(max_length=20, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
