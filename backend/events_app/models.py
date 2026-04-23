from django.conf import settings
from django.db import models


class EventCategory(models.TextChoices):
    MUSIC = "music", "Music"
    SPORTS = "sports", "Sports"
    CULTURE = "culture", "Culture"
    BUSINESS = "business", "Business"
    FOOD = "food", "Food & drink"
    OTHER = "other", "Other"


class Event(models.Model):
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="events_created",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=32,
        choices=EventCategory.choices,
        default=EventCategory.OTHER,
    )
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    venue = models.CharField(max_length=200, blank=True)
    region = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)
    cover_image = models.ImageField(upload_to="events/", blank=True, null=True)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["starts_at"]

    def __str__(self):
        return self.title
