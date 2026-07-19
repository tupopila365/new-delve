"""Shop marketplace middleman — cart, hold, seller fulfill, buyer confirm."""

import json
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import UserType
from shop.models import Cart, CartItem, Order, OrderStatus, PayoutStatus, ShopProduct

User = get_user_model()


@override_settings(SHOP_PLATFORM_FEE_PERCENT="2.5")
class ShopMiddlemanFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(
            username="maker",
            email="maker@test.local",
            password="pass12345",
        )
        # Traveller seller — not a service provider.
        self.seller.profile.user_type = UserType.NORMAL
        self.seller.profile.save()

        self.buyer = User.objects.create_user(
            username="buyer",
            email="buyer@test.local",
            password="pass12345",
        )

        self.product = ShopProduct.objects.create(
            owner=self.seller,
            name="Basket",
            price=Decimal("100.00"),
            stock_quantity=5,
            in_stock=True,
            is_active=True,
            shipping_available=True,
            shipping_fee=Decimal("20.00"),
            pickup_available=True,
        )

    def test_traveller_can_create_shop_product(self):
        self.client.force_authenticate(user=self.seller)
        res = self.client.post(
            "/api/shop/provider-products/",
            {
                "name": "Bracelet",
                "category": "jewellery",
                "price": "50.00",
                "stock_quantity": 3,
                "in_stock": True,
                "pickup_available": True,
                "is_active": False,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["name"], "Bracelet")
        self.assertEqual(ShopProduct.objects.filter(owner=self.seller).count(), 2)

    def test_multipart_create_accepts_photos_json_string(self):
        """FormData posts photos as a JSON string — must not 400 on JSONField."""
        self.client.force_authenticate(user=self.seller)
        cover = "https://res.cloudinary.com/demo/image/upload/v1/shop/bowl.jpg"
        photos = [{"url": cover, "kind": "image"}]
        res = self.client.post(
            "/api/shop/provider-products/",
            {
                "name": "Wooden bowl",
                "category": "crafts",
                "price": "120.00",
                "stock_quantity": "2",
                "in_stock": "true",
                "pickup_available": "true",
                "is_active": "false",
                "cover_image_url": cover,
                "photos": json.dumps(photos),
                "variants_input": json.dumps(
                    [{"label": "Large", "price_override": "140.00", "stock_quantity": 1}]
                ),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 201, res.data)
        product = ShopProduct.objects.get(pk=res.data["id"])
        self.assertEqual(product.name, "Wooden bowl")
        self.assertEqual(product.photos, photos)
        self.assertEqual(product.cover_image, cover)
        self.assertEqual(product.variants.count(), 1)
        self.assertEqual(product.variants.first().label, "Large")

    def test_hold_ship_confirm_releases_payout(self):
        cart = Cart.objects.create(user=self.buyer)
        CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=1,
            unit_price=Decimal("100.00"),
        )

        self.client.force_authenticate(user=self.buyer)
        checkout = self.client.post(
            "/api/shop/orders/",
            {
                "fulfillment_type": "shipping",
                "contact_name": "Buyer",
                "delivery_address": "Lodge X",
            },
            format="json",
        )
        self.assertEqual(checkout.status_code, 201, checkout.data)
        order_ref = checkout.data["orders"][0]["order_ref"]
        order = Order.objects.get(order_ref=order_ref)
        self.assertEqual(order.platform_fee, Decimal("2.50"))
        self.assertEqual(order.seller_payout, Decimal("117.50"))
        self.assertEqual(order.shipping_total, Decimal("20.00"))

        pay = self.client.post(f"/api/shop/orders/{order_ref}/pay/")
        self.assertEqual(pay.status_code, 200, pay.data)
        order.refresh_from_db()
        self.assertEqual(order.status, OrderStatus.PAID)
        self.assertEqual(order.payout_status, PayoutStatus.HELD)

        self.client.force_authenticate(user=self.seller)
        ship = self.client.post(
            f"/api/shop/provider-orders/{order_ref}/mark-shipped/",
            {"tracking_number": "NP123", "tracking_carrier": "NamPost"},
            format="json",
        )
        self.assertEqual(ship.status_code, 200, ship.data)
        order.refresh_from_db()
        self.assertEqual(order.status, OrderStatus.SHIPPED)
        self.assertEqual(order.tracking_number, "NP123")
        self.assertEqual(order.payout_status, PayoutStatus.HELD)

        self.client.force_authenticate(user=self.buyer)
        confirm = self.client.post(f"/api/shop/orders/{order_ref}/confirm/")
        self.assertEqual(confirm.status_code, 200, confirm.data)
        order.refresh_from_db()
        self.assertEqual(order.status, OrderStatus.FULFILLED)
        self.assertEqual(order.payout_status, PayoutStatus.RELEASED)
        self.assertIsNotNone(order.payout_released_at)
