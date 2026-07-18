"""Cart, checkout/order, storefront and provider-order APIs."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.business_access import provider_listing_owner_ids
from accounts.permissions import IsProviderOrBusinessMember

from .commerce_serializers import (
    CartAddSerializer,
    CartSerializer,
    CheckoutSerializer,
    OrderSerializer,
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

User = get_user_model()


def _get_or_create_cart(user) -> Cart:
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


def _resolve_unit_price(product: ShopProduct, variant: ProductVariant | None) -> Decimal:
    if variant is not None:
        return variant.effective_price
    return product.price or Decimal("0")


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
    """Buyer orders — list/retrieve own orders, checkout, and mock-pay."""

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
                order.save(update_fields=["items_total", "shipping_total", "total"])
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
        order.save(update_fields=["status", "mock_payment_ref", "updated_at"])
        return Response(
            {
                "detail": "Payment successful (mock).",
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
        order.status = OrderStatus.CANCELLED
        order.save(update_fields=["status", "updated_at"])
        return Response(OrderSerializer(order, context={"request": request}).data)


class ProviderOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """Seller inbox — orders for shops the user manages."""

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]
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
            qs = qs.filter(status=status_param)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def _transition(self, request, order_ref, target, allowed_from):
        order = self.get_object()
        if order.status not in allowed_from:
            return Response(
                {"detail": f"Cannot move order from {order.status} to {target}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = target
        order.save(update_fields=["status", "updated_at"])
        return Response(OrderSerializer(order, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def fulfill(self, request, order_ref=None):
        return self._transition(request, order_ref, OrderStatus.FULFILLED, {OrderStatus.PAID})

    @action(detail=True, methods=["post"])
    def cancel(self, request, order_ref=None):
        return self._transition(
            request, order_ref, OrderStatus.CANCELLED, {OrderStatus.PENDING, OrderStatus.PAID}
        )

    @action(detail=True, methods=["post"])
    def refund(self, request, order_ref=None):
        return self._transition(
            request, order_ref, OrderStatus.REFUNDED, {OrderStatus.PAID, OrderStatus.FULFILLED}
        )


class SellerStorefrontView(APIView):
    """Public storefront for a seller: profile header + active product catalog."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        seller = User.objects.filter(username__iexact=username).select_related("profile").first()
        if not seller:
            return Response({"detail": "Shop not found."}, status=status.HTTP_404_NOT_FOUND)
        products = (
            ShopProduct.objects.filter(owner=seller, is_active=True)
            .select_related("owner", "owner__profile")
            .prefetch_related("variants")
            .order_by("-is_featured", "-created_at")
        )
        profile = getattr(seller, "profile", None)
        avatar = None
        if profile and getattr(profile, "avatar", None):
            try:
                avatar = request.build_absolute_uri(profile.avatar.url)
            except Exception:
                avatar = None
        display_name = (
            profile.display_name.strip()
            if profile and profile.display_name and profile.display_name.strip()
            else seller.username
        )
        product_data = ShopProductSerializer(
            products, many=True, context={"request": request}
        ).data
        payload = {
            "username": seller.username,
            "display_name": display_name,
            "avatar": avatar,
            "bio": getattr(profile, "bio", "") or "",
            "region": getattr(profile, "region", "") or "",
            "city": getattr(profile, "city", "") or "",
            "product_count": len(product_data),
            "products": product_data,
        }
        return Response(ShopSellerSerializer(payload).data)


class ShopSellerListView(APIView):
    """Public list of shops (sellers) that have active products."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        owners = (
            ShopProduct.objects.filter(is_active=True)
            .values("owner__username")
            .annotate(product_count=Count("id"))
            .order_by("-product_count")[:50]
        )
        results = []
        for row in owners:
            seller = (
                User.objects.filter(username=row["owner__username"])
                .select_related("profile")
                .first()
            )
            if not seller:
                continue
            profile = getattr(seller, "profile", None)
            avatar = None
            if profile and getattr(profile, "avatar", None):
                try:
                    avatar = request.build_absolute_uri(profile.avatar.url)
                except Exception:
                    avatar = None
            display_name = (
                profile.display_name.strip()
                if profile and profile.display_name and profile.display_name.strip()
                else seller.username
            )
            results.append(
                {
                    "username": seller.username,
                    "display_name": display_name,
                    "avatar": avatar,
                    "region": getattr(profile, "region", "") or "",
                    "city": getattr(profile, "city", "") or "",
                    "product_count": row["product_count"],
                }
            )
        return Response(results)
