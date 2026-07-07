from django.conf import settings
from django.db import models


class GroupTopic(models.TextChoices):
    GENERAL = "general", "General"
    SAFETY = "safety", "Safety"
    TRANSPORT = "transport", "Transport"
    FOOD = "food", "Food"
    STAY = "stay", "Stay"
    PRICES = "prices", "Prices"
    VISAS = "visas", "Visas"
    FOUR_BY_FOUR = "4x4", "4×4"
    PHOTOGRAPHY = "photography", "Photos"


class GroupVisibility(models.TextChoices):
    PUBLIC = "public", "Public"
    PRIVATE = "private", "Private"


class MembershipRole(models.TextChoices):
    ADMIN = "admin", "Admin"
    MEMBER = "member", "Member"


class MembershipStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    PENDING = "pending", "Pending"


class CommunityGroup(models.Model):
    slug = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    topic = models.CharField(max_length=32, choices=GroupTopic.choices, default=GroupTopic.GENERAL)
    visibility = models.CharField(
        max_length=16,
        choices=GroupVisibility.choices,
        default=GroupVisibility.PUBLIC,
    )
    cover_image = models.ImageField(upload_to="community_groups/", blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="community_groups_created",
    )
    is_hidden = models.BooleanField(default=False, db_index=True)
    moderation_reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-last_message_at", "-created_at"]

    def __str__(self):
        return self.name


class GroupMembership(models.Model):
    group = models.ForeignKey(CommunityGroup, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="community_group_memberships",
    )
    role = models.CharField(max_length=16, choices=MembershipRole.choices, default=MembershipRole.MEMBER)
    status = models.CharField(max_length=16, choices=MembershipStatus.choices, default=MembershipStatus.ACTIVE)
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["group", "user"], name="uniq_community_group_member"),
        ]
        ordering = ["-joined_at"]

    def __str__(self):
        return f"{self.user_id} in {self.group_id} ({self.status})"


class GroupMessage(models.Model):
    group = models.ForeignKey(CommunityGroup, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="community_group_messages",
    )
    reply_to = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="replies",
    )
    forwarded_from = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="forwards",
    )
    body = models.TextField(blank=True, default="")
    image = models.ImageField(upload_to="community_groups/messages/", blank=True, null=True)
    video = models.FileField(upload_to="community_groups/messages/", blank=True, null=True)
    audio = models.FileField(upload_to="community_groups/messages/", blank=True, null=True)
    is_hidden = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="community_group_messages_deleted",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Message {self.id} in {self.group_id}"

    @property
    def is_deleted_for_everyone(self) -> bool:
        return self.is_hidden and self.deleted_at is not None

    @property
    def preview_text(self) -> str:
        if self.is_deleted_for_everyone:
            return "This message was deleted"
        text = (self.body or "").strip()
        if text:
            return text[:200]
        if self.video:
            return "[Video]"
        if self.image:
            return "[Photo]"
        if self.audio:
            return "[Voice note]"
        if self.forwarded_from_id:
            return self.forwarded_from.preview_text if self.forwarded_from else "[Forwarded message]"
        return ""


class GroupMessageUserHide(models.Model):
    message = models.ForeignKey(GroupMessage, on_delete=models.CASCADE, related_name="hidden_for")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="community_group_message_hides",
    )
    hidden_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["message", "user"], name="uniq_community_group_msg_user_hide"),
        ]
        ordering = ["-hidden_at"]

    def __str__(self):
        return f"hide message {self.message_id} for {self.user_id}"


class GroupMessageReaction(models.Model):
    message = models.ForeignKey(GroupMessage, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="community_group_message_reactions",
    )
    emoji = models.CharField(max_length=16)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["message", "user"], name="uniq_community_group_msg_reaction"),
        ]
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.emoji} on message {self.message_id} by {self.user_id}"
