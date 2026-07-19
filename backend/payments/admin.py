from django.contrib import admin

from payments.models import SimulatedPaymentIntent


@admin.register(SimulatedPaymentIntent)
class SimulatedPaymentIntentAdmin(admin.ModelAdmin):
    list_display = ("stripe_id", "status", "amount", "currency", "target_type", "target_id", "buyer", "created_at")
    list_filter = ("status", "target_type", "refunded")
    search_fields = ("stripe_id", "target_id", "buyer__username", "charge_id")
    readonly_fields = ("stripe_id", "client_secret", "created_at", "confirmed_at")
