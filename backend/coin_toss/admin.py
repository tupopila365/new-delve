from django.contrib import admin

from .models import AntiCommercialFlag, CommunityVote, TossLocation, TossLocationSave


@admin.register(TossLocation)
class TossLocationAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "category",
        "city",
        "region",
        "latitude",
        "longitude",
        "is_excluded",
        "created_at",
    )
    list_filter = ("category", "is_excluded", "region")
    search_fields = ("name", "city", "region", "open_source_ref")


@admin.register(CommunityVote)
class CommunityVoteAdmin(admin.ModelAdmin):
    list_display = ("user", "location", "created_at")
    search_fields = ("user__username", "location__name")


@admin.register(AntiCommercialFlag)
class AntiCommercialFlagAdmin(admin.ModelAdmin):
    list_display = ("user", "location", "reason", "created_at")
    search_fields = ("user__username", "location__name", "reason")


@admin.register(TossLocationSave)
class TossLocationSaveAdmin(admin.ModelAdmin):
    list_display = ("user", "location", "created_at")
    search_fields = ("user__username", "location__name")
    raw_id_fields = ("user", "location")
