from django.contrib import admin

from .models import Order, OrderItem, ProductReview, ShopProduct, ShopProfile


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product_name", "variant_label", "quantity", "unit_price")


@admin.register(ShopProfile)
class ShopProfileAdmin(admin.ModelAdmin):
    list_display = ("owner", "display_name", "has_avatar", "updated_at")
    search_fields = ("owner__username", "display_name")
    raw_id_fields = ("owner",)

    @admin.display(boolean=True, description="Avatar")
    def has_avatar(self, obj):
        return bool(obj.avatar)


@admin.register(ShopProduct)
class ShopProductAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "category", "city", "region", "price", "rating_avg", "rating_count", "is_active", "created_at")
    list_filter = ("category", "is_active", "region", "made_in_namibia")
    search_fields = ("name", "owner__username", "city", "region")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_ref",
        "buyer",
        "seller",
        "status",
        "payout_status",
        "total",
        "platform_fee",
        "seller_payout",
        "fulfillment_type",
        "created_at",
    )
    list_filter = ("status", "payout_status", "fulfillment_type")
    search_fields = ("order_ref", "buyer__username", "seller__username", "tracking_number")
    readonly_fields = ("order_ref", "created_at", "updated_at", "paid_at", "shipped_at", "fulfilled_at", "payout_released_at")
    inlines = [OrderItemInline]


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "reviewer", "rating", "verified", "created_at")
    list_filter = ("rating",)
    raw_id_fields = ("product", "reviewer", "order")
    search_fields = ("product__name", "reviewer__username", "body")

    @admin.display(boolean=True, description="Verified purchase")
    def verified(self, obj):
        return obj.order_id is not None
