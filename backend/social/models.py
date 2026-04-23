from django.conf import settings
from django.db import models


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
    listing = models.ForeignKey(
        "accommodation.AccommodationListing",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="story_posts",
        help_text="Optional link to a listing shown from the story CTA.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Post {self.pk} by {self.author.username}"


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="post_comments",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


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
