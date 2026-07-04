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
    guest_reviews = models.JSONField(
        default=list,
        blank=True,
        help_text='Reviews: [{"name": "...", "place": "...", "rating": 4.5, "body": "..."}]',
    )
    response_hours_typical = models.PositiveSmallIntegerField(
        default=2,
        help_text="Typical first reply time in hours (for social proof).",
    )
    tour_packages = models.JSONField(
        default=list,
        blank=True,
        help_text='Named tours JSON: id,title,hours,price; optional keys: photo/image, '
        'description; gallery or photos/images (string URLs or [{"src"}]); '
        'reviews ([{name,place,rating,body}] same as guest_reviews).',
    )
    years_guiding = models.PositiveSmallIntegerField(null=True, blank=True)
    certifications = models.JSONField(default=list, blank=True)
    licensed_guide = models.BooleanField(default=False)
    languages_detail = models.JSONField(
        default=list,
        blank=True,
        help_text='[{"language": "English", "level": "Fluent"}]',
    )
    portfolio_gallery = models.JSONField(
        default=list,
        blank=True,
        help_text='[{"src": "url", "caption": ""}]',
    )
    guide_stories = models.JSONField(
        default=list,
        blank=True,
        help_text="Provider highlight channels for story rings",
    )
    default_meeting_point = models.CharField(max_length=300, blank=True)
    specialities = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.headline


class GuideSave(models.Model):
    """Traveller bookmark on a tour guide profile."""

    guide = models.ForeignKey(
        TourGuideProfile,
        on_delete=models.CASCADE,
        related_name="user_saves",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="guide_saves",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("guide", "user"),
                name="guide_save_guide_user_uniq",
            ),
        ]


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
    start_time = models.TimeField(null=True, blank=True)
    duration_hours = models.PositiveSmallIntegerField(default=4)
    group_size = models.PositiveSmallIntegerField(default=1)
    meeting_point = models.TextField(blank=True)
    package_id = models.CharField(max_length=64, blank=True)
    notes = models.TextField(blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    mock_payment_ref = models.CharField(max_length=64, blank=True)
    status = models.CharField(max_length=20, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class GuideQuestion(models.Model):
    guide = models.ForeignKey(
        TourGuideProfile,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="guide_questions",
    )
    body = models.TextField()
    is_hidden = models.BooleanField(default=False, db_index=True)
    moderation_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class GuideAnswer(models.Model):
    question = models.ForeignKey(
        GuideQuestion,
        on_delete=models.CASCADE,
        related_name="answers",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="guide_answers",
    )
    body = models.TextField()
    is_official = models.BooleanField(
        default=False,
        help_text="Reply from the guide or business team.",
    )
    is_hidden = models.BooleanField(default=False, db_index=True)
    moderation_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class GuideReview(models.Model):
    guide = models.ForeignKey(
        TourGuideProfile,
        on_delete=models.CASCADE,
        related_name="traveler_reviews",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="guide_reviews",
    )
    booking = models.ForeignKey(
        GuideBooking,
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
                name="guide_review_rating_1_5",
            ),
            models.UniqueConstraint(
                fields=["guide", "reviewer"],
                name="guide_review_one_per_user",
            ),
        ]

