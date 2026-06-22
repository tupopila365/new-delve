from django.contrib import admin

from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "starts_at", "organizer", "category", "is_free", "is_published")
    list_filter = ("category", "is_free", "is_published", "region")
    search_fields = ("title", "venue", "organizer__username")
