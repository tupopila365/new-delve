from django.contrib import admin

from promotions.models import PromotionCampaign, PromotionProduct


@admin.register(PromotionProduct)
class PromotionProductAdmin(admin.ModelAdmin):
    list_display = ("name", "placement", "region", "duration_days", "price_cents", "currency", "is_active")
    list_filter = ("placement", "is_active")
    search_fields = ("name", "slug", "region")


@admin.register(PromotionCampaign)
class PromotionCampaignAdmin(admin.ModelAdmin):
    list_display = (
        "placement",
        "target_type",
        "target_id",
        "region",
        "status",
        "payment_status",
        "starts_at",
        "ends_at",
        "priority",
    )
    list_filter = ("placement", "status", "payment_status", "target_type")
    search_fields = ("target_label", "target_id", "region", "payment_ref", "receipt_number")