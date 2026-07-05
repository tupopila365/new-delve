from django.contrib import admin

from .models import Comment, Follow, Like, Post, Save


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "author", "region", "is_delvers", "is_delvers_highlight", "is_accommodation_story", "listing", "created_at")


admin.site.register(Comment)
admin.site.register(Like)
admin.site.register(Save)
admin.site.register(Follow)
