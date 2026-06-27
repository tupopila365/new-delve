from django.contrib import admin

from .models import Event, EventBooking, EventLike, EventSave, EventQuestion, EventAnswer, EventReview, EventRecurrenceTemplate


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "starts_at", "organizer", "business", "category", "is_free", "is_published")
    list_filter = ("category", "is_free", "is_published", "region")
    search_fields = ("title", "venue", "organizer__username", "business__business_name")
    raw_id_fields = ("organizer", "business")


@admin.register(EventRecurrenceTemplate)
class EventRecurrenceTemplateAdmin(admin.ModelAdmin):
    list_display = ("title", "recurrence", "organizer", "is_active", "last_spawned_at")
    list_filter = ("recurrence", "is_active", "is_free")
    raw_id_fields = ("organizer", "business")


@admin.register(EventLike)
class EventLikeAdmin(admin.ModelAdmin):
    list_display = ("event", "user", "created_at")
    raw_id_fields = ("event", "user")


@admin.register(EventSave)
class EventSaveAdmin(admin.ModelAdmin):
    list_display = ("event", "user", "created_at")
    raw_id_fields = ("event", "user")


@admin.register(EventBooking)
class EventBookingAdmin(admin.ModelAdmin):
    list_display = ("booking_ref", "event", "attendee", "tickets", "status", "checked_in_at", "created_at")
    list_filter = ("status",)
    search_fields = ("booking_ref", "event__title", "attendee__username")
    raw_id_fields = ("event", "attendee")


@admin.register(EventQuestion)
class EventQuestionAdmin(admin.ModelAdmin):
    list_display = ("event", "author", "created_at", "is_hidden")
    raw_id_fields = ("event", "author")


@admin.register(EventAnswer)
class EventAnswerAdmin(admin.ModelAdmin):
    list_display = ("question", "author", "is_official", "created_at")
    raw_id_fields = ("question", "author")


@admin.register(EventReview)
class EventReviewAdmin(admin.ModelAdmin):
    list_display = ("event", "reviewer", "rating", "created_at")
    raw_id_fields = ("event", "booking", "reviewer")
