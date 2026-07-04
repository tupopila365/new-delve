from decimal import Decimal

from django.conf import settings
from django.db import models


class JourneyVisibility(models.TextChoices):
    PUBLIC = "public", "Public"
    PRIVATE = "private", "Private"
    DRAFT = "draft", "Draft"


class CostCategory(models.TextChoices):
    STAY = "stay", "Accommodation"
    FOOD = "food", "Food & drink"
    TRANSPORT = "transport", "Transport"
    ACTIVITY = "activity", "Activities"
    OTHER = "other", "Other"


class Journey(models.Model):
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="journeys",
    )
    title = models.CharField(max_length=160)
    summary = models.TextField(blank=True)
    cover_image = models.TextField(blank=True, help_text="Cover image URL or uploaded path.")
    starts_on = models.DateField()
    ends_on = models.DateField()
    days = models.PositiveSmallIntegerField(default=1)
    countries = models.JSONField(default=list, blank=True)
    transport_modes = models.JSONField(default=list, blank=True)
    party = models.CharField(max_length=32, default="solo")
    tags = models.JSONField(default=list, blank=True)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    currency = models.CharField(max_length=8, default="NAD")
    visibility = models.CharField(
        max_length=16,
        choices=JourneyVisibility.choices,
        default=JourneyVisibility.PUBLIC,
        db_index=True,
    )
    is_hidden = models.BooleanField(default=False, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)
    moderation_reason = models.TextField(blank=True)
    comments_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "journeys"

    def __str__(self):
        return f"{self.title} by {self.author_id}"


class JourneyStop(models.Model):
    journey = models.ForeignKey(Journey, on_delete=models.CASCADE, related_name="stops")
    order = models.PositiveSmallIntegerField(default=0)
    place_name = models.CharField(max_length=200)
    region = models.CharField(max_length=120, blank=True)
    country_code = models.CharField(max_length=8, default="NA")
    arrived_on = models.DateField()
    left_on = models.DateField()
    notes = models.TextField(blank=True)
    cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    linked_listing_type = models.CharField(max_length=24, blank=True)
    linked_listing_id = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["order", "id"]


class JourneyEntry(models.Model):
    stop = models.ForeignKey(JourneyStop, on_delete=models.CASCADE, related_name="entries")
    body = models.TextField(blank=True)
    image = models.TextField(blank=True)
    video = models.TextField(blank=True)
    happened_at = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["id"]
        verbose_name_plural = "journey entries"


class JourneyCostLine(models.Model):
    journey = models.ForeignKey(Journey, on_delete=models.CASCADE, related_name="costs")
    category = models.CharField(max_length=16, choices=CostCategory.choices, default=CostCategory.OTHER)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.CharField(max_length=240, blank=True)

    class Meta:
        ordering = ["id"]


class JourneyLike(models.Model):
    journey = models.ForeignKey(Journey, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="journey_likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["journey", "user"]]


class JourneySave(models.Model):
    journey = models.ForeignKey(Journey, on_delete=models.CASCADE, related_name="saves")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="journey_saves")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["journey", "user"]]


class JourneyQuestion(models.Model):
    journey = models.ForeignKey(
        Journey,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="journey_questions",
    )
    body = models.TextField()
    is_hidden = models.BooleanField(default=False, db_index=True)
    moderation_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class JourneyAnswer(models.Model):
    question = models.ForeignKey(
        JourneyQuestion,
        on_delete=models.CASCADE,
        related_name="answers",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="journey_answers",
    )
    body = models.TextField()
    is_official = models.BooleanField(
        default=False,
        help_text="Reply from the journey author.",
    )
    is_hidden = models.BooleanField(default=False, db_index=True)
    moderation_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
