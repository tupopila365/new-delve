"""Cart, checkout/order, storefront and provider-order APIs."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.business_access import provider_listing_owner_ids

from .commerce_serializers import (
    CartAddSerializer,
    CartSerializer,
    CheckoutSerializer,
    OrderSerializer,
    SellerFulfillmentSerializer,
)
from .commerce_services import (
    apply_marketplace_totals,
    mark_fulfilled,
    mark_payment_held,
    mark_refunded,
)
from .models import (
    Cart,
    CartItem,
    FulfillmentType,
    Order,
    OrderItem,
    OrderStatus,
    ProductVariant,
    ShopProduct,
)
from .serializers import ShopProductSerializer, ShopSellerSerializer
from .shop_identity import shop_avatar_url, shop_display_name

User = get_user_model()


def _get_or_create_cart(user) -> Cart:
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


def _resolve_unit_price(product: ShopProduct, variant: ProductVariant | None) -> Decimal:
    if variant is not None:
        return variant.effective_price
    return product.price or Decimal("0")


def _restore_order_to_cart(order: Order, user) -> None:
    """Put pending-order lines back into the buyer's cart (e.g. abandoned payment)."""
    cart = _get_or_create_cart(user)
    for line in order.items.select_related("product", "variant").all():
        if not line.product_id:
            continue
        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product_id=line.product_id,
            variant_id=line.variant_id,
            defaults={
                "quantity": line.quantity,
                "unit_price": line.unit_price,
            },
        )
        if not created:
            item.quantity = min(99, item.quantity + line.quantity)
            item.unit_price = line.unit_price
            item.save(update_fields=["quantity", "unit_price"])


def _restore_order_stock(order: Order) -> None:
    for line in order.items.select_related("product").all():
        if line.product_id and line.product:
            line.product.increment_stock(line.quantity)


class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cart = _get_or_create_cart(request.user)
        return Response(CartSerializer(cart, context={"request": request}).data)

    def post(self, request):
        cart = _get_or_create_cart(request.user)
        ser = CartAddSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        product = ser.validated_data["product_obj"]
        variant = ser.validated_data["variant_obj"]
        quantity = ser.validated_data["quantity"]

        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            variant=variant,
            defaults={
                "quantity": quantity,
                "unit_price": _resolve_unit_price(product, variant),
            },
        )
        if not created:
            item.quantity = min(99, item.quantity + quantity)
            item.unit_price = _resolve_unit_price(product, variant)
            item.save(update_fields=["quantity", "unit_price"])
        return Response(
            CartSerializer(cart, context={"request": request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CartMergeView(APIView):
    """Merge a guest cart (list of {product, variant?, quantity}) into the user cart."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        cart = _get_or_create_cart(request.user)
        rows = request.data.get("items", [])
        if isinstance(rows, list):
            for row in rows:
                ser = CartAddSerializer(data=row)
                if not ser.is_valid():
                    continue
                product = ser.validated_data["product_obj"]
                variant = ser.validated_data["variant_obj"]
                quantity = ser.validated_data["quantity"]
                item, created = CartItem.objects.get_or_create(
                    cart=cart,
                    product=product,
                    variant=variant,
                    defaults={
                        "quantity": quantity,
                        "unit_price": _resolve_unit_price(product, variant),
                    },
                )
                if not created:
                    item.quantity = min(99, item.quantity + quantity)
                    item.save(update_fields=["quantity"])
        return Response(CartSerializer(cart, context={"request": request}).data)


class CartItemView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_item(self, request, pk):
        return CartItem.objects.filter(pk=pk, cart__user=request.user).first()

    def patch(self, request, pk):
        item = self._get_item(request, pk)
        if not item:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            quantity = int(request.data.get("quantity", item.quantity))
        except (TypeError, ValueError):
            return Response({"quantity": "Invalid quantity."}, status=status.HTTP_400_BAD_REQUEST)
        if quantity <= 0:
            item.delete()
        else:
            item.quantity = min(99, quantity)
            item.save(update_fields=["quantity"])
        cart = _get_or_create_cart(request.user)
        return Response(CartSerializer(cart, context={"request": request}).data)

    def delete(self, request, pk):
        item = self._get_item(request, pk)
        if item:
            item.delete()
        cart = _get_or_create_cart(request.user)
        return Response(CartSerializer(cart, context={"request": request}).data)


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """Buyer orders — list/retrieve own orders, checkout, mock-pay, and confirm receipt."""

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "order_ref"

    def get_queryset(self):
        return (
            Order.objects.filter(buyer=self.request.user)
            .select_related("buyer", "seller", "seller__profile")
            .prefetch_related("items")
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def create(self, request, *args, **kwargs):
        ser = CheckoutSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        cart = _get_or_create_cart(request.user)
        items = list(cart.items.select_related("product", "product__owner", "variant").all())

        seller_filter = (data.get("seller_username") or "").strip().lower()
        if seller_filter:
            items = [i for i in items if i.product.owner.username.lower() == seller_filter]

        if not items:
            return Response({"detail": "Your cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

        from shop.seller_gates import can_accept_paid_orders

        blocked = []
        for item in items:
            seller = item.product.owner
            ok, reason = can_accept_paid_orders(seller)
            if not ok:
                blocked.append(f"{item.product.name}: {reason}")
        if blocked:
            return Response(
                {
                    "detail": "Some items cannot be checked out yet.",
                    "sellers": blocked,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        fulfillment = data.get("fulfillment_type", FulfillmentType.PICKUP)

        # Group cart items by seller — one order per shop.
        by_seller: dict[int, list[CartItem]] = {}
        for item in items:
            by_seller.setdefault(item.product.owner_id, []).append(item)

        created_orders = []
        with transaction.atomic():
            for seller_id, seller_items in by_seller.items():
                order = Order.objects.create(
                    buyer=request.user,
                    seller_id=seller_id,
                    fulfillment_type=fulfillment,
                    contact_name=data.get("contact_name", "")[:160],
                    contact_phone=data.get("contact_phone", "")[:40],
                    delivery_address=data.get("delivery_address", "")[:400],
                    note=data.get("note", ""),
                    status=OrderStatus.PENDING,
                )
                shipping_fee = Decimal("0")
                for item in seller_items:
                    OrderItem.objects.create(
                        order=order,
                        product=item.product,
                        variant=item.variant,
                        product_name=item.product.name,
                        variant_label=item.variant.label if item.variant else "",
                        quantity=item.quantity,
                        unit_price=item.unit_price,
                    )
                    if item.product.stock_quantity:
                        item.product.decrement_stock(item.quantity)
                    if fulfillment == FulfillmentType.SHIPPING and item.product.shipping_available:
                        shipping_fee = max(shipping_fee, item.product.shipping_fee or Decimal("0"))
                order.shipping_total = shipping_fee
                order.recalc_totals()
                apply_marketplace_totals(order)
                order.save(
                    update_fields=[
                        "items_total",
                        "shipping_total",
                        "total",
                        "platform_fee",
                        "seller_payout",
                    ]
                )
                created_orders.append(order)

            # Remove purchased items from the cart.
            item_ids = [i.id for group in by_seller.values() for i in group]
            CartItem.objects.filter(id__in=item_ids).delete()

        payload = OrderSerializer(created_orders, many=True, context={"request": request}).data
        return Response({"orders": payload}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def pay(self, request, order_ref=None):
        import uuid

        order = self.get_object()
        if order.status != OrderStatus.PENDING:
            return Response({"detail": "Order is not awaiting payment."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = OrderStatus.PAID
        order.mock_payment_ref = f"mock_{uuid.uuid4().hex[:16]}"
        fields = ["status", "mock_payment_ref", "updated_at", *mark_payment_held(order)]
        order.save(update_fields=list(dict.fromkeys(fields)))
        return Response(
            {
                "detail": "Payment successful (mock). Delve is holding funds until the seller fulfills.",
                "status": order.status,
                "mock_payment_ref": order.mock_payment_ref,
                "order": OrderSerializer(order, context={"request": request}).data,
            }
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request, order_ref=None):
        order = self.get_object()
        if order.status not in (OrderStatus.PENDING, OrderStatus.PAID):
            return Response({"detail": "Order cannot be cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        previous = order.status
        with transaction.atomic():
            _restore_order_stock(order)
            # Payment never finished — put items back so the buyer can try again.
            if previous == OrderStatus.PENDING and order.buyer_id == request.user.id:
                _restore_order_to_cart(order, request.user)
            order.status = OrderStatus.CANCELLED
            order.save(update_fields=["status", "updated_at"])
        return Response(OrderSerializer(order, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def confirm(self, request, order_ref=None):
        """Buyer confirms receipt — releases seller payout."""
        order = self.get_object()
        if order.status not in (OrderStatus.READY, OrderStatus.SHIPPED):
            return Response(
                {"detail": "Order is not awaiting confirmation."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        fields = mark_fulfilled(order)
        order.save(update_fields=list(dict.fromkeys(fields)))
        return Response(OrderSerializer(order, context={"request": request}).data)


class ProviderOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """Seller inbox — orders for shops the user manages. Sellers handle shipping/pickup."""

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "order_ref"

    def get_queryset(self):
        owner_ids = provider_listing_owner_ids(self.request.user)
        qs = (
            Order.objects.filter(seller_id__in=owner_ids)
            .select_related("buyer", "seller", "buyer__profile")
            .prefetch_related("items")
        )
        status_param = self.request.query_params.get("status")
        if status_param:
            # Convenience: "open" = paid + ready + shipped (awaiting seller / buyer confirm).
            if status_param == "open":
                qs = qs.filter(
                    status__in=(OrderStatus.PAID, OrderStatus.READY, OrderStatus.SHIPPED)
                )
            else:
                qs = qs.filter(status=status_param)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def _apply_fulfillment_fields(self, order, data: dict) -> list[str]:
        fields: list[str] = []
        if "tracking_number" in data:
            order.tracking_number = (data.get("tracking_number") or "")[:120]
            fields.append("tracking_number")
        if "tracking_carrier" in data:
            order.tracking_carrier = (data.get("tracking_carrier") or "")[:80]
            fields.append("tracking_carrier")
        if "fulfillment_note" in data:
            order.fulfillment_note = (data.get("fulfillment_note") or "")[:300]
            fields.append("fulfillment_note")
        return fields

    @action(detail=True, methods=["post"], url_path="mark-ready")
    def mark_ready(self, request, order_ref=None):
        """Seller: ready for pickup or lodge drop-off."""
        order = self.get_object()
        if order.status != OrderStatus.PAID:
            return Response(
                {"detail": f"Cannot mark ready from {order.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = SellerFulfillmentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        order.status = OrderStatus.READY
        order.shipped_at = timezone.now()
        fields = ["status", "shipped_at", "updated_at", *self._apply_fulfillment_fields(order, ser.validated_data)]
        order.save(update_fields=list(dict.fromkeys(fields)))
        return Response(OrderSerializer(order, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="mark-shipped")
    def mark_shipped(self, request, order_ref=None):
        """Seller: dispatched with courier (seller-managed shipping)."""
        order = self.get_object()
        if order.status != OrderStatus.PAID:
            return Response(
                {"detail": f"Cannot mark shipped from {order.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = SellerFulfillmentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        order.status = OrderStatus.SHIPPED
        order.shipped_at = timezone.now()
        fields = ["status", "shipped_at", "updated_at", *self._apply_fulfillment_fields(order, ser.validated_data)]
        order.save(update_fields=list(dict.fromkeys(fields)))
        return Response(OrderSerializer(order, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def fulfill(self, request, order_ref=None):
        """Seller confirms handoff complete (also releases payout)."""
        order = self.get_object()
        if order.status not in (OrderStatus.PAID, OrderStatus.READY, OrderStatus.SHIPPED):
            return Response(
                {"detail": f"Cannot fulfill from {order.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = SellerFulfillmentSerializer(data=request.data or {})
        ser.is_valid(raise_exception=True)
        extra = self._apply_fulfillment_fields(order, ser.validated_data)
        fields = [*extra, *mark_fulfilled(order)]
        order.save(update_fields=list(dict.fromkeys(fields)))
        return Response(OrderSerializer(order, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, order_ref=None):
        order = self.get_object()
        if order.status not in (OrderStatus.PENDING, OrderStatus.PAID):
            return Response(
                {"detail": f"Cannot move order from {order.status} to cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = OrderStatus.CANCELLED
        order.save(update_fields=["status", "updated_at"])
        return Response(OrderSerializer(order, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def refund(self, request, order_ref=None):
        order = self.get_object()
        if order.status not in (
            OrderStatus.PAID,
            OrderStatus.READY,
            OrderStatus.SHIPPED,
            OrderStatus.FULFILLED,
        ):
            return Response(
                {"detail": f"Cannot move order from {order.status} to refunded."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        fields = mark_refunded(order)
        order.save(update_fields=list(dict.fromkeys(fields)))
        return Response(OrderSerializer(order, context={"request": request}).data)


class SellerStorefrontView(APIView):
    """Public storefront for a seller: profile header + active product catalog."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        username = (username or "").strip()
        seller = (
            User.objects.filter(username__iexact=username)
            .select_related("profile", "shop_profile")
            .first()
        )
        if not seller:
            return Response({"detail": "Shop not found."}, status=status.HTTP_404_NOT_FOUND)
        products = (
            ShopProduct.objects.filter(owner=seller, is_active=True)
            .select_related("owner", "owner__profile", "owner__shop_profile")
            .prefetch_related("variants")
            .order_by("-is_featured", "-created_at")
        )
        profile = getattr(seller, "profile", None)
        payload = {
            "username": seller.username,
            "display_name": shop_display_name(seller),
            "avatar": shop_avatar_url(seller, request),
            "bio": getattr(profile, "bio", "") or "",
            "region": getattr(profile, "region", "") or "",
            "city": getattr(profile, "city", "") or "",
            "product_count": products.count(),
            "products": products,
        }
        return Response(ShopSellerSerializer(payload, context={"request": request}).data)


class ShopSellerListView(APIView):
    """Public list of shops (sellers) that have active products."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        owner_rows = (
            ShopProduct.objects.filter(is_active=True)
            .values("owner_id")
            .annotate(product_count=Count("id"))
            .order_by("-product_count")[:50]
        )
        counts = {row["owner_id"]: row["product_count"] for row in owner_rows}
        if not counts:
            return Response([])

        sellers = (
            User.objects.filter(id__in=counts.keys())
            .select_related("profile", "shop_profile")
            .order_by("username")
        )
        # Keep popularity order from the annotate query.
        by_id = {user.id: user for user in sellers}
        results = []
        for owner_id, product_count in counts.items():
            seller = by_id.get(owner_id)
            if not seller:
                continue
            profile = getattr(seller, "profile", None)
            results.append(
                {
                    "username": seller.username,
                    "display_name": shop_display_name(seller),
                    "avatar": shop_avatar_url(seller, request),
                    "region": getattr(profile, "region", "") or "",
                    "city": getattr(profile, "city", "") or "",
                    "product_count": product_count,
                }
            )
        return Response(results)
