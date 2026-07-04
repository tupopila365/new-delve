from django.contrib import admin

from .models import BookingAutomatedMessageLog, Conversation, Message, ProviderMessagingSettings


@admin.register(BookingAutomatedMessageLog)
class BookingAutomatedMessageLogAdmin(admin.ModelAdmin):
    list_display = ("booking_type", "booking_id", "trigger", "created_at")
    search_fields = ("booking_type",)
    raw_id_fields = ("message",)


@admin.register(ProviderMessagingSettings)
class ProviderMessagingSettingsAdmin(admin.ModelAdmin):
    list_display = ("user", "business", "auto_welcome_enabled", "booking_confirmed_enabled", "quick_replies_enabled", "updated_at")
    search_fields = ("user__username", "user__email", "business__business_name")
    raw_id_fields = ("user", "business")


admin.site.register(Conversation)
admin.site.register(Message)
