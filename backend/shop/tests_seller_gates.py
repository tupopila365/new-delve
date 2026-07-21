"""Shop seller readiness gates — email, profile, phone, payout (no ID docs)."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import UserType
from shop.commerce_services import release_seller_payout
from shop.models import Order, OrderStatus, PayoutStatus, ShopProfile
from shop.seller_gates import (
    can_accept_paid_orders,
    can_publish_product,
    can_receive_payout,
    otp_cache_key,
    seller_readiness,
)

User = get_user_model()


class ShopSellerGateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(
            username="gate_seller",
            email="gate_seller@test.local",
            password="pass12345",
        )
        self.seller.profile.user_type = UserType.NORMAL
        self.seller.profile.email_verified = False
        self.seller.profile.save()
        self.shop = ShopProfile.objects.create(
            owner=self.seller,
            display_name="",
            region="",
            city="",
            fulfillment_notes="",
        )

    def _complete_profile(self):
        self.shop.display_name = "Gate Shop"
        self.shop.region = "Khomas"
        self.shop.city = "Windhoek"
        self.shop.fulfillment_notes = "Pickup at the market stall."
        self.shop.save()

    def _verify_email(self):
        self.seller.profile.email_verified = True
        self.seller.profile.save(update_fields=["email_verified"])

    def _verify_phone(self):
        self.shop.phone = "+264811111111"
        self.shop.phone_verified_at = timezone.now()
        self.shop.save(update_fields=["phone", "phone_verified_at", "updated_at"])

    def _set_payout(self):
        self.shop.payout_method = ShopProfile.PayoutMethod.BANK
        self.shop.payout_account_name = "Gate Seller"
        self.shop.payout_account_number = "1234567890"
        self.shop.payout_details_set_at = timezone.now()
        self.shop.save()

    def test_cannot_publish_without_email(self):
        self._complete_profile()
        ok, reason = can_publish_product(self.seller, shop=self.shop, activating=True)
        self.assertFalse(ok)
        self.assertIn("email", reason.lower())

    def test_cannot_publish_without_profile(self):
        self._verify_email()
        ok, reason = can_publish_product(self.seller, shop=self.shop, activating=True)
        self.assertFalse(ok)
        self.assertIn("profile", reason.lower())

    def test_can_publish_when_email_and_profile_ready(self):
        self._verify_email()
        self._complete_profile()
        ok, reason = can_publish_product(self.seller, shop=self.shop, activating=True)
        self.assertTrue(ok, reason)

    def test_api_blocks_publish_until_ready(self):
        self.client.force_authenticate(user=self.seller)
        res = self.client.post(
            "/api/shop/provider-products/",
            {
                "name": "Draft mug",
                "price": "50.00",
                "stock_quantity": 2,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400, res.data)
        self.assertIn("is_active", res.data)

        self._verify_email()
        self._complete_profile()
        res = self.client.post(
            "/api/shop/provider-products/",
            {
                "name": "Live mug",
                "price": "50.00",
                "stock_quantity": 2,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(res.data["is_active"])

    def test_draft_allowed_without_gates(self):
        self.client.force_authenticate(user=self.seller)
        res = self.client.post(
            "/api/shop/provider-products/",
            {
                "name": "Quiet draft",
                "price": "20.00",
                "stock_quantity": 1,
                "is_active": False,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertFalse(res.data["is_active"])

    def test_paid_orders_require_phone(self):
        self._verify_email()
        self._complete_profile()
        ok, reason = can_accept_paid_orders(self.seller, shop=self.shop)
        self.assertFalse(ok)
        self.assertIn("phone", reason.lower())
        self._verify_phone()
        ok, reason = can_accept_paid_orders(self.seller, shop=self.shop)
        self.assertTrue(ok, reason)

    def test_payout_requires_details(self):
        self._verify_email()
        self._complete_profile()
        self._verify_phone()
        ok, reason = can_receive_payout(self.seller, shop=self.shop)
        self.assertFalse(ok)
        self.assertIn("payout", reason.lower())
        self._set_payout()
        ok, reason = can_receive_payout(self.seller, shop=self.shop)
        self.assertTrue(ok, reason)

    def test_release_holds_without_payout_details(self):
        self._verify_email()
        self._complete_profile()
        self._verify_phone()
        buyer = User.objects.create_user(
            username="gate_buyer",
            email="gate_buyer@test.local",
            password="pass12345",
        )
        order = Order.objects.create(
            buyer=buyer,
            seller=self.seller,
            status=OrderStatus.PAID,
            items_total=Decimal("100.00"),
            total=Decimal("100.00"),
            platform_fee=Decimal("10.00"),
            seller_payout=Decimal("90.00"),
            payout_status=PayoutStatus.HELD,
        )
        fields = release_seller_payout(order)
        self.assertEqual(fields, [])
        self.assertEqual(order.payout_status, PayoutStatus.HELD)

        self._set_payout()
        fields = release_seller_payout(order)
        self.assertIn("payout_status", fields)
        self.assertEqual(order.payout_status, PayoutStatus.RELEASED)
        order.save(update_fields=fields)
        order.refresh_from_db()
        self.assertEqual(order.payout_status, PayoutStatus.RELEASED)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", DEBUG=True)
    def test_phone_otp_flow(self):
        from django.core.cache import cache

        self.client.force_authenticate(user=self.seller)
        res = self.client.post(
            "/api/shop/provider-profile/phone/request-otp/",
            {"phone": "+264822222222"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        code = res.data.get("debug_code")
        if not code:
            cached = cache.get(otp_cache_key(self.seller.pk)) or {}
            code = cached.get("code")
        self.assertTrue(code)

        res = self.client.post(
            "/api/shop/provider-profile/phone/verify/",
            {"code": code},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data.get("phone_verified"))
        readiness = res.data.get("readiness") or {}
        self.assertTrue(readiness.get("phone_verified"))

    def test_profile_readiness_payload(self):
        self._verify_email()
        self._complete_profile()
        data = seller_readiness(self.seller)
        self.assertTrue(data["email_verified"])
        self.assertTrue(data["profile_complete"])
        self.assertFalse(data["phone_verified"])
        self.assertTrue(data["can_publish"])

        self.client.force_authenticate(user=self.seller)
        res = self.client.patch(
            "/api/shop/provider-profile/",
            {
                "display_name": "Gate Shop",
                "region": "Khomas",
                "city": "Windhoek",
                "fulfillment_notes": "Pickup at the market stall.",
                "payout_method": "bank",
                "payout_account_name": "Gate Seller",
                "payout_account_number": "999",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data["readiness"]["payout_details_complete"])
