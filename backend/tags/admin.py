from django.contrib import admin

from .models import Tag, TaggedItem


class TaggedItemInline(admin.TabularInline):
    model = TaggedItem
    extra = 0
    readonly_fields = ("content_type", "object_id", "scope", "region", "created_at")
    can_delete = True


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("slug", "use_count", "is_blocked", "last_used_at", "created_at")
    list_filter = ("is_blocked",)
    search_fields = ("slug", "blocked_reason")
    readonly_fields = ("use_count", "last_used_at", "created_at")
    inlines = [TaggedItemInline]
    actions = ["block_tags", "unblock_tags"]

    @admin.action(description="Block selected tags")
    def block_tags(self, request, queryset):
        queryset.update(is_blocked=True)

    @admin.action(description="Unblock selected tags")
    def unblock_tags(self, request, queryset):
        queryset.update(is_blocked=False, blocked_reason="")


@admin.register(TaggedItem)
class TaggedItemAdmin(admin.ModelAdmin):
    list_display = ("tag", "scope", "content_type", "object_id", "region", "created_at")
    list_filter = ("scope", "content_type")
    search_fields = ("tag__slug", "region")
    raw_id_fields = ("tag",)
