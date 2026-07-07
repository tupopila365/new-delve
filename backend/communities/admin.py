from django.contrib import admin

from .models import CommunityGroup, GroupMembership, GroupMessage


@admin.register(CommunityGroup)
class CommunityGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "topic", "visibility", "is_hidden", "created_by", "last_message_at")
    list_filter = ("topic", "visibility", "is_hidden")
    search_fields = ("name", "slug", "description")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ("group", "user", "role", "status", "joined_at")
    list_filter = ("role", "status")


@admin.register(GroupMessage)
class GroupMessageAdmin(admin.ModelAdmin):
    list_display = ("group", "author", "body", "is_hidden", "created_at")
    list_filter = ("is_hidden",)
