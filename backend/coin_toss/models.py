from django.conf import settings
from django.db import models


class LocationCategory(models.TextChoices):
    VIEWPOINT = "viewpoint", "Viewpoint"
    HIKE = "hike", "Hike / trail"
    BEACH = "beach", "Beach / coast"
    WATER = "water", "Water / swim"
    MARKET = "market", "Market"
    CAFE = "cafe", "Café / spot to linger"
    CULTURE = "culture", "Culture / heritage"
    WILDLIFE = "wildlife", "Wildlife"
    SPORTS = "sports", "Sports / active"
    EVENT = "event", "Event / happening"
    FREE = "free", "Free to visit"
    HIDDEN = "hidden", "Hidden gem"
    OTHER = "other", "Other"


class TossLocation(models.Model):
    """
    Community-sourced place for the unbiased coin-toss randomizer.
    No premium / sponsored fields — selection must stay organic.
    """

    name = models.CharField(max_length=200)
    category = models.CharField(
        max_length=32,
        choices=LocationCategory.choices,
        default=LocationCategory.OTHER,
    )
    description = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    region = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)
    open_source_ref = models.CharField(
        max_length=300,
        blank=True,
        help_text="OpenStreetMap node/way id, Wikidata Q-id, or similar organic reference.",
    )
    media = models.JSONField(
        default=list,
        blank=True,
        help_text='Photos/videos: [{"url": "...", "kind": "image"|"video"}].',
    )
    is_excluded = models.BooleanField(
        default=False,
        help_text="Kill switch: set when commercial flags reach the threshold.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["latitude", "longitude"]),
            models.Index(fields=["is_excluded"]),
        ]

    def __str__(self):
        return self.name


class CommunityVote(models.Model):
    """One upvote per user per location. Requires physical proximity at vote time."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="coin_toss_votes",
    )
    location = models.ForeignKey(
        TossLocation,
        on_delete=models.CASCADE,
        related_name="votes",
    )
    voter_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    voter_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "location"],
                name="uniq_coin_toss_vote_user_location",
            )
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user_id} → {self.location_id}"


class AntiCommercialFlag(models.Model):
    """Report that a spot is gaming the randomizer for commercial gain."""

    COMMERCIAL_FLAG_KILL_THRESHOLD = 3

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="coin_toss_flags",
    )
    location = models.ForeignKey(
        TossLocation,
        on_delete=models.CASCADE,
        related_name="commercial_flags",
    )
    reason = models.CharField(max_length=400, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "location"],
                name="uniq_coin_toss_flag_user_location",
            )
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"flag {self.user_id} → {self.location_id}"


class TossLocationSave(models.Model):
    """Bookmark a tossed spot to revisit later (and upvote when you get there)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="coin_toss_saves",
    )
    location = models.ForeignKey(
        TossLocation,
        on_delete=models.CASCADE,
        related_name="saves",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "location"],
                name="uniq_coin_toss_save_user_location",
            )
        ]

    def __str__(self):
        return f"save {self.user_id} → {self.location_id}"
