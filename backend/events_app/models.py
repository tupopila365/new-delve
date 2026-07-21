from django.conf import settings
from django.db import models


class EventCategory(models.TextChoices):
    MUSIC = "music", "Music"
    SPORTS = "sports", "Sports"
    CULTURE = "culture", "Culture"
    BUSINESS = "business", "Business"
    FOOD = "food", "Foodies"
    OTHER = "other", "Other"


class EventRecurrence(models.TextChoices):
    WEEKLY = "weekly", "Weekly"
    BIWEEKLY = "biweekly", "Every 2 weeks"
    MONTHLY = "monthly", "Monthly"


class EventRecurrenceTemplate(models.Model):
    """Reusable event blueprint — paid entry uses external ticket URLs only."""

    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_recurrence_templates",
    )
    business = models.ForeignKey(
        "accounts.BusinessProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="event_recurrence_templates",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=32,
        choices=EventCategory.choices,
        default=EventCategory.OTHER,
    )
    venue = models.CharField(max_length=200, blank=True)
    region = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)
    cover_image = models.ImageField(upload_to="events/templates/", blank=True, null=True)
    is_free = models.BooleanField(default=False)
    price = models.CharField(
        max_length=32,
        blank=True,
        help_text="Display price shown alongside external ticket link.",
    )
    ticket_url = models.URLField(
        blank=True,
        help_text="Required for paid recurring events — on-platform ticketing is not supported for templates.",
    )
    capacity = models.PositiveIntegerField(null=True, blank=True)
    default_start_time = models.TimeField(
        help_text="Local start time applied when spawning occurrences.",
    )
    default_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    recurrence = models.CharField(
        max_length=16,
        choices=EventRecurrence.choices,
        default=EventRecurrence.WEEKLY,
    )
    weekday = models.PositiveSmallIntegerField(
        default=5,
        help_text="0=Monday … 6=Sunday for weekly/biweekly schedules.",
    )
    day_of_month = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="1–28 for monthly schedules.",
    )
    is_active = models.BooleanField(default=True)
    last_spawned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return f"{self.title} ({self.get_recurrence_display()})"


class Event(models.Model):
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="events_created",
    )
    business = models.ForeignKey(
        "accounts.BusinessProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
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
    gallery_images = models.JSONField(
        default=list,
        blank=True,
        help_text="Additional hero gallery media (cover is separate).",
    )
    is_free = models.BooleanField(default=False)
    price = models.CharField(
        max_length=32,
        blank=True,
        help_text="Admission price amount (e.g. 150); UI prefixes currency.",
    )
    ticket_url = models.URLField(blank=True)
    external_ticket_clicks = models.PositiveIntegerField(default=0)
    capacity = models.PositiveIntegerField(null=True, blank=True)
    recurrence_template = models.ForeignKey(
        EventRecurrenceTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="spawned_events",
    )
    is_published = models.BooleanField(default=True)
    event_stories = models.JSONField(
        default=list,
        blank=True,
        help_text="Organizer highlight channels for story rings",
    )
    comments_count = models.PositiveIntegerField(
        default=0,
        help_text="Cached count of top-level visible comments.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["starts_at"]

    def __str__(self):
        return self.title


class EventLike(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="user_likes")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("event", "user"),
                name="events_event_like_event_user_uniq",
            ),
        ]


class EventSave(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="user_saves")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_saves",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("event", "user"),
                name="events_event_save_event_user_uniq",
            ),
        ]


class EventCategoryFollow(models.Model):
    """Subscribe to an event category so matching events rank higher in the feed."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_category_follows",
    )
    category = models.CharField(max_length=32, choices=EventCategory.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["user", "category"]]
        indexes = [
            models.Index(fields=["user", "created_at"], name="events_catf_user_created_idx"),
            models.Index(fields=["category"], name="events_catf_category_idx"),
        ]

    def __str__(self):
        return f"{self.user_id} → {self.category}"


class EventBookingStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    CONFIRMED = "confirmed", "Confirmed"
    CHECKED_IN = "checked_in", "Checked in"
    CANCELLED = "cancelled", "Cancelled"
    REFUNDED = "refunded", "Refunded"


class EventBooking(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="bookings")
    attendee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_bookings",
    )
    tickets = models.PositiveSmallIntegerField(default=1)
    total_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=EventBookingStatus.choices,
        default=EventBookingStatus.CONFIRMED,
    )
    booking_ref = models.CharField(max_length=20, unique=True)
    special_requests = models.TextField(blank=True)
    mock_payment_ref = models.CharField(max_length=64, blank=True)
    check_in_token = models.CharField(max_length=32, blank=True, db_index=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=("event", "attendee"),
                name="events_event_booking_event_attendee_uniq",
            ),
        ]

    def __str__(self):
        return f"{self.booking_ref} — {self.event.title}"


class EventQuestion(models.Model):
    """Threaded event comments — same shape as journey/social comments."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="questions")
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
        help_text="Top-level comments have no parent; replies reference their parent comment.",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_questions",
    )
    body = models.TextField()
    is_hidden = models.BooleanField(default=False, db_index=True)
    moderation_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class EventQuestionHelpful(models.Model):
    question = models.ForeignKey(
        EventQuestion,
        on_delete=models.CASCADE,
        related_name="helpful_votes",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="helpful_event_question_votes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["question", "user"]]


class EventAnswer(models.Model):
    """Legacy one-level reply table — retained briefly for migration compatibility."""

    question = models.ForeignKey(EventQuestion, on_delete=models.CASCADE, related_name="answers")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_answers",
    )
    body = models.TextField()
    is_official = models.BooleanField(
        default=False,
        help_text="Reply from the event organizer or business team.",
    )
    is_hidden = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class EventReview(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="reviews")
    booking = models.OneToOneField(
        EventBooking,
        on_delete=models.CASCADE,
        related_name="review",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_reviews",
    )
    rating = models.PositiveSmallIntegerField()
    body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name="events_event_review_rating_1_5",
            ),
        ]
