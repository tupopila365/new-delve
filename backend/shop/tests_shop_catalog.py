"""Public shop catalog + cart merge."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserType
from shop.models import ShopProduct

User = get_user_model()


class ShopPublicCatalogTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(
            username="catalog_seller",
            email="catalog@test.local",
            password="pass12345",
        )
        self.seller.profile.user_type = UserType.NORMAL
        self.seller.profile.save()

        self.khomas = ShopProduct.objects.create(
            owner=self.seller,
            name="Windhoek craft",
            price=Decimal("100.00"),
            stock_quantity=3,
            in_stock=True,
            is_active=True,
            region="Khomas",
            city="Windhoek",
        )
        self.erongo = ShopProduct.objects.create(
            owner=self.seller,
            name="Coastal spice",
            price=Decimal("80.00"),
            stock_quantity=5,
            in_stock=True,
            is_active=True,
            region="Erongo",
            city="Swakopmund",
        )
        self.blank_region = ShopProduct.objects.create(
            owner=self.seller,
            name="Ship anywhere mug",
            price=Decimal("60.00"),
            stock_quantity=10,
            in_stock=True,
            is_active=True,
            region="",
        )
        ShopProduct.objects.create(
            owner=self.seller,
            name="Draft only",
            price=Decimal("10.00"),
            stock_quantity=1,
            in_stock=True,
            is_active=False,
            region="Khomas",
        )

    def test_public_list_only_active(self):
        res = self.client.get("/api/shop/products/")
        self.assertEqual(res.status_code, 200)
        names = {row["name"] for row in res.data}
        self.assertIn("Windhoek craft", names)
        self.assertIn("Coastal spice", names)
        self.assertNotIn("Draft only", names)

    def test_region_filter_includes_blank_and_icontains(self):
        res = self.client.get("/api/shop/products/", {"region": "Khomas"})
        self.assertEqual(res.status_code, 200)
        names = {row["name"] for row in res.data}
        self.assertIn("Windhoek craft", names)
        self.assertIn("Ship anywhere mug", names)
        self.assertNotIn("Coastal spice", names)

    def test_cart_requires_auth_and_accepts_active_product(self):
        buyer = User.objects.create_user(
            username="buyer_cart",
            email="buyer_cart@test.local",
            password="pass12345",
        )
        res = self.client.post(
            "/api/shop/cart/",
            {"product": self.khomas.id, "quantity": 1},
            format="json",
        )
        self.assertEqual(res.status_code, 401)

        self.client.force_authenticate(user=buyer)
        res = self.client.post(
            "/api/shop/cart/",
            {"product": self.khomas.id, "quantity": 2},
            format="json",
        )
        self.assertIn(res.status_code, (200, 201), res.data)
        self.assertEqual(res.data["item_count"], 2)

    def test_cart_merge_from_guest_payload(self):
        buyer = User.objects.create_user(
            username="buyer_merge",
            email="buyer_merge@test.local",
            password="pass12345",
        )
        self.client.force_authenticate(user=buyer)
        res = self.client.post(
            "/api/shop/cart/merge/",
            {
                "items": [
                    {"product": self.khomas.id, "quantity": 1},
                    {"product": self.erongo.id, "quantity": 3},
                ]
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["item_count"], 4)

    def test_sellers_list_uses_shop_display_name(self):
        from shop.models import ShopProfile

        ShopProfile.objects.create(owner=self.seller, display_name="Vicious Craft Co")
        res = self.client.get("/api/shop/sellers/")
        self.assertEqual(res.status_code, 200)
        row = next(r for r in res.data if r["username"] == self.seller.username)
        self.assertEqual(row["display_name"], "Vicious Craft Co")

        store = self.client.get(f"/api/shop/sellers/{self.seller.username}/")
        self.assertEqual(store.status_code, 200)
        self.assertEqual(store.data["display_name"], "Vicious Craft Co")
        self.assertGreaterEqual(store.data["product_count"], 1)

    def test_cancel_pending_restores_cart(self):
        from shop.models import Cart, CartItem, Order

        buyer = User.objects.create_user(
            username="buyer_cancel",
            email="buyer_cancel@test.local",
            password="pass12345",
        )
        cart = Cart.objects.create(user=buyer)
        CartItem.objects.create(
            cart=cart,
            product=self.khomas,
            quantity=2,
            unit_price=Decimal("100.00"),
        )
        self.client.force_authenticate(user=buyer)
        checkout = self.client.post(
            "/api/shop/orders/",
            {"fulfillment_type": "pickup", "contact_name": "Buyer"},
            format="json",
        )
        self.assertEqual(checkout.status_code, 201, checkout.data)
        self.assertEqual(CartItem.objects.filter(cart=cart).count(), 0)
        order_ref = checkout.data["orders"][0]["order_ref"]
        self.khomas.refresh_from_db()
        stock_after = self.khomas.stock_quantity

        cancel = self.client.post(f"/api/shop/orders/{order_ref}/cancel/")
        self.assertEqual(cancel.status_code, 200, cancel.data)
        self.assertEqual(CartItem.objects.filter(cart=cart).count(), 1)
        self.khomas.refresh_from_db()
        self.assertEqual(self.khomas.stock_quantity, stock_after + 2)
        self.assertEqual(Order.objects.get(order_ref=order_ref).status, "cancelled")
