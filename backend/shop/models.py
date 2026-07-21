import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models


class ShopCategory(models.TextChoices):
    SOUVENIRS = "souvenirs", "Souvenirs & gifts"
    CRAFTS = "crafts", "Handmade crafts"
    JEWELLERY = "jewellery", "Jewellery"
    CLOTHING = "clothing", "Clothing & textiles"
    ART = "art", "Art & prints"
    BOOKS_MAPS = "books_maps", "Books & maps"
    LOCAL_FOOD = "local_food", "Local food & pantry"
    GEAR = "gear", "Safari & travel gear"
    OTHER = "other", "Other"


class ShopProfile(models.Model):
    """Seller shop identity — avatar + name shown on the public storefront."""

    class PayoutMethod(models.TextChoices):
        BANK = "bank", "Bank transfer"
        MOBILE_MONEY = "mobile_money", "Mobile money"
        OTHER = "other", "Other"

    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shop_profile",
    )
    display_name = models.CharField(
        max_length=120,
        blank=True,
        help_text="Public shop name. Falls back to the account display name when empty.",
    )
    avatar = models.ImageField(upload_to="shop_avatars/", blank=True, null=True)
    region = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)
    fulfillment_notes = models.CharField(
        max_length=400,
        blank=True,
        help_text="How buyers get items — pickup spot, shipping areas, lodge drop-off, etc.",
    )
    phone = models.CharField(max_length=40, blank=True)
    phone_verified_at = models.DateTimeField(null=True, blank=True)
    payout_method = models.CharField(
        max_length=20,
        choices=PayoutMethod.choices,
        blank=True,
    )
    payout_account_name = models.CharField(max_length=160, blank=True)
    payout_account_number = models.CharField(max_length=80, blank=True)
    payout_details_set_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ShopProfile<{self.owner_id}>"


class ShopProduct(models.Model):
    """A retail product sold by a seller (shop). Supports cart + checkout."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shop_products",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    tagline = models.CharField(max_length=240, blank=True)
    category = models.CharField(
        max_length=32,
        choices=ShopCategory.choices,
        default=ShopCategory.SOUVENIRS,
    )
    region = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)
    pickup_address = models.CharField(
        max_length=300,
        blank=True,
        help_text="Where travellers can collect — market stall, shop, lodge desk, etc.",
    )
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    price_note = models.CharField(
        max_length=80,
        blank=True,
        help_text="e.g. per item, from, per set",
    )
    sku = models.CharField(max_length=64, blank=True)
    stock_quantity = models.PositiveIntegerField(
        default=0,
        help_text="Units available for purchase. 0 = out of stock.",
    )
    in_stock = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    # Fulfillment options the seller offers for this product.
    pickup_available = models.BooleanField(default=True)
    lodge_delivery = models.BooleanField(
        default=False,
        help_text="Can deliver to a lodge or hotel in the area.",
    )
    shipping_available = models.BooleanField(default=False)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    made_in_namibia = models.BooleanField(default=False)
    artisan_name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    photos = models.JSONField(default=list, blank=True)
    cover_image = models.TextField(blank=True)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal("0"))
    rating_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def available_quantity(self) -> int:
        return int(self.stock_quantity or 0)

    def is_available(self) -> bool:
        return bool(self.in_stock) and self.available_quantity > 0

    def decrement_stock(self, quantity: int) -> None:
        """Reduce stock after a purchase and flip in_stock when depleted."""
        remaining = max(0, self.available_quantity - max(0, int(quantity)))
        self.stock_quantity = remaining
        if remaining == 0:
            self.in_stock = False
        self.save(update_fields=["stock_quantity", "in_stock", "updated_at"])

    def increment_stock(self, quantity: int) -> None:
        """Restore stock when a pending/paid order is cancelled."""
        restored = self.available_quantity + max(0, int(quantity))
        self.stock_quantity = restored
        if restored > 0:
            self.in_stock = True
        self.save(update_fields=["stock_quantity", "in_stock", "updated_at"])


class ProductVariant(models.Model):
    """An optional purchasable variation of a product (size, colour, etc.)."""

    product = models.ForeignKey(
        ShopProduct,
        on_delete=models.CASCADE,
        related_name="variants",
    )
    label = models.CharField(max_length=120)
    price_override = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Overrides the product price when set.",
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    sku = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.product.name} — {self.label}"

    @property
    def effective_price(self) -> Decimal:
        return self.price_override if self.price_override is not None else self.product.price


class Cart(models.Model):
    """A buyer's active shopping cart (one per user)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shop_cart",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart<{self.user_id}>"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(ShopProduct, on_delete=models.CASCADE, related_name="+")
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product", "variant"],
                name="unique_cart_product_variant",
            ),
        ]

    def __str__(self):
        return f"{self.quantity}× {self.product.name}"

    @property
    def line_total(self) -> Decimal:
        return (self.unit_price or Decimal("0")) * self.quantity


class OrderStatus(models.TextChoices):
    PENDING = "pending", "Pending payment"
    PAID = "paid", "Paid — awaiting seller"
    READY = "ready", "Ready for pickup / delivery"
    SHIPPED = "shipped", "Shipped"
    FULFILLED = "fulfilled", "Fulfilled"
    CANCELLED = "cancelled", "Cancelled"
    REFUNDED = "refunded", "Refunded"


class PayoutStatus(models.TextChoices):
    NONE = "none", "Not paid yet"
    HELD = "held", "Held by Delve"
    RELEASED = "released", "Released to seller"
    REFUNDED = "refunded", "Refunded to buyer"


class FulfillmentType(models.TextChoices):
    PICKUP = "pickup", "Pickup"
    LODGE_DELIVERY = "lodge_delivery", "Lodge / hotel delivery"
    SHIPPING = "shipping", "Shipping"


def generate_order_ref() -> str:
    return f"SHP-{uuid.uuid4().hex[:8].upper()}"


class Order(models.Model):
    """A confirmed purchase from a single seller (shop)."""

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shop_orders",
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shop_sales",
    )
    order_ref = models.CharField(max_length=20, unique=True, default=generate_order_ref)
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
    )
    fulfillment_type = models.CharField(
        max_length=20,
        choices=FulfillmentType.choices,
        default=FulfillmentType.PICKUP,
    )
    items_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    shipping_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    platform_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0"),
        help_text="Delve marketplace fee (from items only).",
    )
    seller_payout = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0"),
        help_text="Amount released to the seller after fee (includes shipping).",
    )
    payout_status = models.CharField(
        max_length=20,
        choices=PayoutStatus.choices,
        default=PayoutStatus.NONE,
    )
    contact_name = models.CharField(max_length=160, blank=True)
    contact_phone = models.CharField(max_length=40, blank=True)
    delivery_address = models.CharField(max_length=400, blank=True)
    note = models.TextField(blank=True)
    tracking_number = models.CharField(max_length=120, blank=True)
    tracking_carrier = models.CharField(max_length=80, blank=True)
    fulfillment_note = models.CharField(
        max_length=300,
        blank=True,
        help_text="Seller note for pickup window, courier, lodge drop, etc.",
    )
    mock_payment_ref = models.CharField(max_length=64, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    fulfilled_at = models.DateTimeField(null=True, blank=True)
    payout_released_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_ref

    def recalc_totals(self) -> None:
        items_total = sum((item.line_total for item in self.items.all()), Decimal("0"))
        self.items_total = items_total
        self.total = items_total + (self.shipping_total or Decimal("0"))


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        ShopProduct,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    product_name = models.CharField(max_length=200)
    variant_label = models.CharField(max_length=120, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.quantity}× {self.product_name}"

    @property
    def line_total(self) -> Decimal:
        return (self.unit_price or Decimal("0")) * self.quantity


class ProductReview(models.Model):
    """A buyer's star rating + written review of a product, with optional photos/videos."""

    product = models.ForeignKey(
        ShopProduct,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_reviews",
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        help_text="Set when the reviewer purchased the product (verified purchase).",
    )
    rating = models.PositiveSmallIntegerField()
    body = models.TextField(blank=True)
    media = models.JSONField(
        default=list,
        blank=True,
        help_text='List of {"url": ..., "kind": "image"|"video"} the reviewer attached.',
    )
    is_hidden = models.BooleanField(default=False, db_index=True)
    moderation_note = models.CharField(max_length=255, blank=True)
    seller_reply = models.TextField(blank=True)
    seller_replied_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name="product_review_rating_1_5",
            ),
            models.UniqueConstraint(
                fields=["product", "reviewer"],
                name="unique_product_review_per_user",
            ),
        ]

    def __str__(self):
        return f"{self.rating}★ {self.product.name} by {self.reviewer_id}"
