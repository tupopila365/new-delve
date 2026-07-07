from django.conf import settings
from django.db import models
from django.db.models import Q

from config.cloudinary_field_storages import (
    audio_field_storage,
    image_field_storage,
    video_field_storage,
)


def make_pair_key(user_a_id: int, user_b_id: int) -> str:
    low, high = sorted((int(user_a_id), int(user_b_id)))
    return f"{low}:{high}"


# Marketplace / booking context attached to a 1:1 thread (latest wins).
CONTEXT_TYPES = frozenset(
    {
        "accommodation",
        "food",
        "guide",
        "event",
        "transport",
        "bus_trip",
        "booking_stay",
        "booking_guide",
        "booking_vehicle",
        "booking_bus",
        "booking_food",
        "booking_event",
    }
)

CONTEXT_HREF_TEMPLATES = {
    "accommodation": "/accommodation/{id}",
    "food": "/food/{id}",
    "guide": "/guides/{id}",
    "event": "/events/{id}",
    "transport": "/transport/vehicle/{id}",
    "bus_trip": "/transport/bus/{id}",
    "booking_stay": "/dashboard/bookings/stay/{id}",
    "booking_guide": "/dashboard/bookings/guide/{id}",
    "booking_vehicle": "/dashboard/bookings/vehicle/{id}",
    "booking_bus": "/dashboard/bookings/bus/{id}",
    "booking_food": "/dashboard/bookings/food/{id}",
    "booking_event": "/dashboard/bookings/event/{id}",
}


def context_href(context_type: str, context_id: int | None) -> str | None:
    if not context_type or context_id is None:
        return None
    template = CONTEXT_HREF_TEMPLATES.get(context_type)
    if not template:
        return None
    return template.format(id=context_id)


def resolve_context_label(context_type: str, context_id: int | None, fallback: str = "") -> str:
    label = (fallback or "").strip()
    if label:
        return label[:200]
    if not context_type or context_id is None:
        return ""
    try:
        if context_type == "accommodation":
            from accommodation.models import AccommodationListing

            return (
                AccommodationListing.objects.filter(pk=context_id).values_list("title", flat=True).first() or ""
            )[:200]
        if context_type == "food":
            from food.models import FoodVenue

            return (FoodVenue.objects.filter(pk=context_id).values_list("name", flat=True).first() or "")[:200]
        if context_type == "guide":
            from guides.models import TourGuideProfile

            row = (
                TourGuideProfile.objects.filter(pk=context_id)
                .values_list("headline", "user__username")
                .first()
            )
            if not row:
                return ""
            headline, username = row
            return (headline or username or "")[:200]
        if context_type == "event":
            from events_app.models import Event

            return (Event.objects.filter(pk=context_id).values_list("title", flat=True).first() or "")[:200]
        if context_type == "transport":
            from transport.models import VehicleRentalListing

            return (
                VehicleRentalListing.objects.filter(pk=context_id).values_list("title", flat=True).first() or ""
            )[:200]
        if context_type == "bus_trip":
            from transport.models import BusTrip

            trip = BusTrip.objects.select_related("route").filter(pk=context_id).first()
            if not trip or not trip.route_id:
                return ""
            return f"{trip.route.origin} → {trip.route.destination}"[:200]
    except Exception:
        return ""
    return ""


class Conversation(models.Model):
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="conversations",
    )
    # Stable 1:1 identity — "minUserId:maxUserId"
    pair_key = models.CharField(max_length=64, unique=True, null=True, blank=True, db_index=True)
    context_type = models.CharField(max_length=32, blank=True, default="")
    context_id = models.PositiveIntegerField(null=True, blank=True)
    context_label = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def context_payload(self) -> dict | None:
        if not self.context_type:
            return None
        href = context_href(self.context_type, self.context_id)
        label = (self.context_label or "").strip()
        if not label and self.context_id is not None:
            label = resolve_context_label(self.context_type, self.context_id)
        if not label and not href:
            return None
        return {
            "type": self.context_type,
            "id": self.context_id,
            "label": label or self.context_type.replace("_", " ").title(),
            "href": href,
        }


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
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
    image = models.ImageField(
        upload_to="messaging/messages/",
        storage=image_field_storage,
        blank=True,
        null=True,
    )
    video = models.FileField(
        upload_to="messaging/messages/",
        storage=video_field_storage,
        blank=True,
        null=True,
    )
    audio = models.FileField(
        upload_to="messaging/messages/",
        storage=audio_field_storage,
        blank=True,
        null=True,
    )
    read = models.BooleanField(default=False)
    is_automated = models.BooleanField(
        default=False,
        help_text="Provider-configured welcome or system message; not typed live by the sender.",
    )
    is_hidden = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="messages_deleted",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

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


class MessageUserHide(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="hidden_for")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="message_hides",
    )
    hidden_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["message", "user"], name="uniq_dm_message_user_hide"),
        ]
        ordering = ["-hidden_at"]


MAX_AUTO_WELCOME_BODY = 1000
MAX_QUICK_REPLY_LEN = 120
MAX_QUICK_REPLIES = 6


class ProviderMessagingSettings(models.Model):
    """Automated welcome and composer shortcuts — per provider account or business."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="provider_messaging_settings",
    )
    business = models.OneToOneField(
        "accounts.BusinessProfile",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="messaging_settings",
    )
    auto_welcome_enabled = models.BooleanField(default=False)
    auto_welcome_body = models.TextField(blank=True, default="")
    booking_confirmed_enabled = models.BooleanField(default=False)
    booking_confirmed_body = models.TextField(blank=True, default="")
    quick_replies_enabled = models.BooleanField(default=False)
    quick_replies = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Provider messaging settings"
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(business__isnull=True),
                name="uniq_provider_messaging_default_per_user",
            ),
        ]

    def __str__(self):
        if self.business_id:
            return f"Messaging settings for business {self.business_id}"
        return f"Messaging settings for user {self.user_id}"


class BookingAutomatedMessageLog(models.Model):
    """Ensures each booking trigger sends at most one automated message."""

    TRIGGER_CONFIRMED = "confirmed"

    booking_type = models.CharField(max_length=32)
    booking_id = models.PositiveIntegerField()
    trigger = models.CharField(max_length=32, default=TRIGGER_CONFIRMED)
    message = models.ForeignKey(
        Message,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking_automation_logs",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["booking_type", "booking_id", "trigger"],
                name="uniq_booking_automated_message",
            ),
        ]
        ordering = ["-created_at"]


class MessageBlock(models.Model):
    """User-level block — either direction prevents messaging."""

    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="messaging_blocks_created",
    )
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="messaging_blocks_received",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["blocker", "blocked"], name="uniq_messaging_block"),
        ]
        ordering = ["-created_at"]


def messaging_blocked_either_way(user_a_id: int, user_b_id: int) -> bool:
    return MessageBlock.objects.filter(
        Q(blocker_id=user_a_id, blocked_id=user_b_id) | Q(blocker_id=user_b_id, blocked_id=user_a_id)
    ).exists()
