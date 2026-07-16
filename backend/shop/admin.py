from django.contrib import admin

from .models import ShopProduct


@admin.register(ShopProduct)
class ShopProductAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "category", "city", "region", "price", "is_active", "created_at")
    list_filter = ("category", "is_active", "region", "made_in_namibia")
    search_fields = ("name", "owner__username", "city", "region")
