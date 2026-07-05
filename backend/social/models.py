from django.conf import settings
from django.db import models


class PostKind(models.TextChoices):
    TIP = "tip", "Tip"
    QUESTION = "question", "Question"


class Post(models.Model):
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="posts",
    )
    body = models.TextField(blank=True)
    region = models.CharField(max_length=120, blank=True)
    image = models.ImageField(upload_to="posts/", blank=True, null=True)
    video = models.FileField(
        upload_to="posts/videos/",
        blank=True,
        null=True,
        help_text="Short video (e.g. mp4, webm). Use image or video, not both.",
    )
    delvers_board = models.CharField(
        max_length=120,
        blank=True,
        help_text="Collection/board name for Delvers",
    )
    is_delvers = models.BooleanField(
        default=False,
        help_text="If true, shown prominently on Delvers discovery",
    )
    is_accommodation_story = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Host/provider story ring on Stays — not mixed into home or Delvers feeds.",
    )
    is_delvers_highlight = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Delvers story highlight — shown in rings only, not the pin feed.",
    )
    post_kind = models.CharField(
        max_length=16,
        choices=PostKind.choices,
        default=PostKind.TIP,
        db_index=True,
        help_text="Community feed: tip or ask-locals question.",
    )
    place_label = models.CharField(
        max_length=200,
        blank=True,
        help_text="Free-text place for ask-locals questions, e.g. Windhoek, Namibia.",
    )
    listing = models.ForeignKey(
        "accommodation.AccommodationListing",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="story_posts",
        help_text="Optional link to a listing shown from the story CTA.",
    )
    event = models.ForeignKey(
        "events_app.Event",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="delvers_posts",
        help_text="Optional link to an event for Delvers moments.",
    )
    vehicle_listing = models.ForeignKey(
        "transport.VehicleRentalListing",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="delvers_posts",
        help_text="Optional link to a vehicle rental for Delvers moments.",
    )
    bus_trip = models.ForeignKey(
        "transport.BusTrip",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="delvers_posts",
        help_text="Optional link to a bus trip for Delvers moments.",
    )
    food_venue = models.ForeignKey(
        "food.FoodVenue",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="delvers_posts",
        help_text="Optional link to a food venue for Delvers moments.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_hidden = models.BooleanField(default=False, db_index=True)
    moderation_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Post {self.pk} by {self.author.username}"


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
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
        related_name="post_comments",
    )
    body = models.TextField()
    is_accepted_answer = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Marked by the question author as the best answer.",
    )
    hearted_by_author = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Post author hearted this comment (creator heart).",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_hidden = models.BooleanField(default=False, db_index=True)
    moderation_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["created_at"]


class CommentHelpful(models.Model):
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name="helpful_votes")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="helpful_comment_votes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["comment", "user"]]


class CommentDislike(models.Model):
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name="dislike_votes")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dislike_comment_votes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["comment", "user"]]


class Like(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["post", "user"]]


class Save(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="saves")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saves",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["post", "user"]]


class Fire(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="fires")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="fires",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["post", "user"]]


class Follow(models.Model):
    follower = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="following_rel",
    )
    following = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="followers_rel",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["follower", "following"]]
