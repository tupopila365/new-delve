from django.contrib import admin

from .models import ProductReview, ShopProduct


@admin.register(ShopProduct)
class ShopProductAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "category", "city", "region", "price", "rating_avg", "rating_count", "is_active", "created_at")
    list_filter = ("category", "is_active", "region", "made_in_namibia")
    search_fields = ("name", "owner__username", "city", "region")


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "reviewer", "rating", "verified", "created_at")
    list_filter = ("rating",)
    raw_id_fields = ("product", "reviewer", "order")
    search_fields = ("product__name", "reviewer__username", "body")

    @admin.display(boolean=True, description="Verified purchase")
    def verified(self, obj):
        return obj.order_id is not None
