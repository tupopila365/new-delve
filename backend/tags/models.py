from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils import timezone


class TagScope(models.TextChoices):
    COMMUNITY = "community", "Community"
    GROUPS = "groups", "Groups"
    DELVERS = "delvers", "Delvers"
    JOURNEYS = "journeys", "Journeys"
    EVENTS = "events", "Events"
    FOOD = "food", "Food"
    STAYS = "stays", "Stays"


class Tag(models.Model):
    slug = models.SlugField(max_length=64, unique=True)
    is_blocked = models.BooleanField(default=False, db_index=True)
    blocked_reason = models.TextField(blank=True)
    use_count = models.PositiveIntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["slug"]

    def __str__(self):
        return f"#{self.slug}"


class TaggedItem(models.Model):
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name="items")
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")
    scope = models.CharField(max_length=32, choices=TagScope.choices, db_index=True)
    region = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tag", "content_type", "object_id"],
                name="tags_taggeditem_unique_tag_object",
            ),
        ]
        indexes = [
            models.Index(fields=["scope", "tag"]),
            models.Index(fields=["content_type", "object_id"]),
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        Tag.objects.filter(pk=self.tag_id).update(
            last_used_at=timezone.now(),
        )
