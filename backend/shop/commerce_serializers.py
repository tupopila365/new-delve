"""Serializers for cart and order (checkout) flows."""

from decimal import Decimal

from rest_framework import serializers

from .models import (
    Cart,
    CartItem,
    FulfillmentType,
    Order,
    OrderItem,
    ProductVariant,
    ShopProduct,
)
from .serializers import (
    _cover_image_url,
    _owner_avatar,
    _owner_display_name,
)


def _price_label(value) -> str:
    if value is None:
        return ""
    return f"N${Decimal(value):.2f}".rstrip("0").rstrip(".")


class CartItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_cover = serializers.SerializerMethodField()
    variant_label = serializers.CharField(source="variant.label", read_only=True, default=None)
    seller_username = serializers.CharField(source="product.owner.username", read_only=True)
    seller_display_name = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()
    available_quantity = serializers.IntegerField(source="product.available_quantity", read_only=True)

    class Meta:
        model = CartItem
        fields = (
            "id",
            "product_id",
            "product_name",
            "product_cover",
            "variant",
            "variant_label",
            "seller_username",
            "seller_display_name",
            "quantity",
            "unit_price",
            "line_total",
            "available_quantity",
        )
        read_only_fields = ("id", "unit_price")

    def get_product_cover(self, obj) -> str | None:
        return _cover_image_url(obj.product, self.context.get("request"))

    def get_seller_display_name(self, obj) -> str:
        return _owner_display_name(obj.product.owner)

    def get_line_total(self, obj) -> str:
        return f"{obj.line_total:.2f}"


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ("id", "items", "subtotal", "item_count", "updated_at")

    def get_subtotal(self, obj) -> str:
        total = sum((item.line_total for item in obj.items.all()), Decimal("0"))
        return f"{total:.2f}"

    def get_item_count(self, obj) -> int:
        return sum(item.quantity for item in obj.items.all())


class CartAddSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    variant = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1, max_value=99, default=1)

    def validate(self, attrs):
        product = (
            ShopProduct.objects.filter(pk=attrs["product"], is_active=True).first()
        )
        if not product:
            raise serializers.ValidationError({"product": "Product not found."})
        variant = None
        variant_id = attrs.get("variant")
        if variant_id:
            variant = ProductVariant.objects.filter(pk=variant_id, product=product).first()
            if not variant:
                raise serializers.ValidationError({"variant": "Invalid variant for this product."})
        attrs["product_obj"] = product
        attrs["variant_obj"] = variant
        return attrs


class OrderItemSerializer(serializers.ModelSerializer):
    product_cover = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product",
            "product_name",
            "product_cover",
            "variant_label",
            "quantity",
            "unit_price",
            "line_total",
        )

    def get_product_cover(self, obj) -> str | None:
        if obj.product:
            return _cover_image_url(obj.product, self.context.get("request"))
        return None

    def get_line_total(self, obj) -> str:
        return f"{obj.line_total:.2f}"


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    buyer_username = serializers.CharField(source="buyer.username", read_only=True)
    buyer_display_name = serializers.SerializerMethodField()
    seller_username = serializers.CharField(source="seller.username", read_only=True)
    seller_display_name = serializers.SerializerMethodField()
    seller_avatar = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    fulfillment_label = serializers.CharField(source="get_fulfillment_type_display", read_only=True)
    payout_status_label = serializers.CharField(source="get_payout_status_display", read_only=True)
    seller_handles_fulfillment = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "order_ref",
            "buyer_username",
            "buyer_display_name",
            "seller_username",
            "seller_display_name",
            "seller_avatar",
            "status",
            "status_label",
            "fulfillment_type",
            "fulfillment_label",
            "items",
            "items_total",
            "shipping_total",
            "platform_fee",
            "seller_payout",
            "total",
            "payout_status",
            "payout_status_label",
            "contact_name",
            "contact_phone",
            "delivery_address",
            "note",
            "tracking_number",
            "tracking_carrier",
            "fulfillment_note",
            "mock_payment_ref",
            "seller_handles_fulfillment",
            "paid_at",
            "shipped_at",
            "fulfilled_at",
            "payout_released_at",
            "created_at",
        )

    def get_buyer_display_name(self, obj) -> str:
        return _owner_display_name(obj.buyer)

    def get_seller_display_name(self, obj) -> str:
        return _owner_display_name(obj.seller)

    def get_seller_avatar(self, obj) -> str | None:
        return _owner_avatar(obj.seller, self.context.get("request"))

    def get_seller_handles_fulfillment(self, obj) -> bool:
        """Delve is the payments middleman; sellers handle shipping/pickup."""
        return True


class SellerFulfillmentSerializer(serializers.Serializer):
    """Seller marks an order ready or shipped (they handle logistics)."""

    tracking_number = serializers.CharField(max_length=120, required=False, allow_blank=True)
    tracking_carrier = serializers.CharField(max_length=80, required=False, allow_blank=True)
    fulfillment_note = serializers.CharField(max_length=300, required=False, allow_blank=True)


class CheckoutSerializer(serializers.Serializer):
    """Create one order per seller from the buyer's cart."""

    fulfillment_type = serializers.ChoiceField(
        choices=FulfillmentType.choices, default=FulfillmentType.PICKUP
    )
    contact_name = serializers.CharField(max_length=160, allow_blank=True, required=False)
    contact_phone = serializers.CharField(max_length=40, allow_blank=True, required=False)
    delivery_address = serializers.CharField(max_length=400, allow_blank=True, required=False)
    note = serializers.CharField(allow_blank=True, required=False)
    seller_username = serializers.CharField(required=False, allow_blank=True)
