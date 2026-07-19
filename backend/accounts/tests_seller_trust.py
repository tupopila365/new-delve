from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.marketplace_payout import PayoutStatus
from accounts.models import BusinessProfile, MarketplaceDispute, VerificationStatus
from accounts.seller_trust import MIN_RATE_SAMPLE, get_seller_trust
from shop.models import Order, OrderStatus

User = get_user_model()


class SellerTrustTests(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            username="trust_seller", email="trust_seller@test.local", password="pass12345"
        )
        self.buyer = User.objects.create_user(
            username="trust_buyer", email="trust_buyer@test.local", password="pass12345"
        )
        self.biz = BusinessProfile.objects.create(
            owner=self.seller,
            slug="trust-co",
            business_name="Trust Co",
            verification_status=VerificationStatus.VERIFIED,
        )
        for i in range(MIN_RATE_SAMPLE):
            Order.objects.create(
                buyer=self.buyer,
                seller=self.seller,
                status=OrderStatus.FULFILLED,
                items_total=Decimal("100.00"),
                shipping_total=Decimal("0"),
                total=Decimal("100.00"),
                platform_fee=Decimal("2.50"),
                seller_payout=Decimal("97.50"),
                payout_status=PayoutStatus.RELEASED,
                mock_payment_ref=f"pi_sim_trust_{i}",
            )

    def test_verified_and_fulfillment_rate(self):
        snap = get_seller_trust(username="trust_seller")
        self.assertTrue(snap["business_verified"])
        self.assertEqual(snap["fulfillment_total"], MIN_RATE_SAMPLE)
        self.assertEqual(snap["fulfillment_rate"], 1.0)
        self.assertTrue(any(b["id"] == "verified" for b in snap["badges"]))
        self.assertTrue(any(b["id"] == "fulfillment" for b in snap["badges"]))

    def test_dispute_rate_badge(self):
        MarketplaceDispute.objects.create(
            opener=self.buyer,
            seller=self.seller,
            source="shop",
            record_id=1,
            reason="not_received",
            body="Never arrived at the lodge front desk area.",
            status=MarketplaceDispute.Status.OPEN,
        )
        snap = get_seller_trust(user_id=self.seller.pk)
        self.assertEqual(snap["disputes_total"], 1)
        self.assertEqual(snap["dispute_rate"], round(1 / MIN_RATE_SAMPLE, 4))

    def test_low_cancel_rate_badge(self):
        snap = get_seller_trust(username="trust_seller")
        self.assertEqual(snap["cancels_total"], 0)
        self.assertEqual(snap["cancel_sample"], MIN_RATE_SAMPLE)
        self.assertEqual(snap["cancel_rate"], 0.0)
        self.assertTrue(any(b["id"] == "cancel_low" for b in snap["badges"]))

    def test_high_cancel_rate_badge(self):
        for i in range(3):
            Order.objects.create(
                buyer=self.buyer,
                seller=self.seller,
                status=OrderStatus.CANCELLED,
                items_total=Decimal("40.00"),
                shipping_total=Decimal("0"),
                total=Decimal("40.00"),
                platform_fee=Decimal("1.00"),
                seller_payout=Decimal("39.00"),
                payout_status=PayoutStatus.NONE,
                mock_payment_ref=f"pi_sim_cancel_{i}",
            )
        # 3 cancelled / (5 fulfilled + 3 cancelled) = 0.375
        snap = get_seller_trust(username="trust_seller")
        self.assertEqual(snap["cancels_total"], 3)
        self.assertEqual(snap["cancel_sample"], 8)
        self.assertEqual(snap["cancel_rate"], 0.375)
        self.assertTrue(any(b["id"] == "cancel_high" for b in snap["badges"]))
        self.assertFalse(any(b["id"] == "cancel_low" for b in snap["badges"]))

    def test_public_api(self):
        res = self.client.get(reverse("seller-trust", kwargs={"username": "trust_seller"}))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertTrue(res.data["business_verified"])

        biz = self.client.get(reverse("business-trust", kwargs={"pk": self.biz.pk}))
        self.assertEqual(biz.status_code, status.HTTP_200_OK, biz.data)
        self.assertEqual(biz.data["seller_username"], "trust_seller")

    def test_hides_rate_below_min_sample(self):
        Order.objects.all().delete()
        Order.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            status=OrderStatus.FULFILLED,
            items_total=Decimal("50.00"),
            shipping_total=Decimal("0"),
            total=Decimal("50.00"),
            platform_fee=Decimal("1.25"),
            seller_payout=Decimal("48.75"),
            payout_status=PayoutStatus.RELEASED,
            mock_payment_ref="pi_sim_one",
        )
        snap = get_seller_trust(username="trust_seller")
        self.assertIsNone(snap["fulfillment_rate"])
        self.assertTrue(any(b["id"] == "fulfillment_building" for b in snap["badges"]))

    def test_payout_gate_blocks_unverified_new_seller(self):
        self.biz.verification_status = VerificationStatus.UNVERIFIED
        self.biz.save(update_fields=["verification_status"])
        Order.objects.all().delete()
        order = Order.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            status=OrderStatus.FULFILLED,
            items_total=Decimal("80.00"),
            shipping_total=Decimal("0"),
            total=Decimal("80.00"),
            platform_fee=Decimal("2.00"),
            seller_payout=Decimal("78.00"),
            payout_status=PayoutStatus.HELD,
            mock_payment_ref="pi_sim_frozen",
        )
        from shop.commerce_services import release_seller_payout

        fields = release_seller_payout(order)
        self.assertEqual(fields, [])
        order.refresh_from_db()
        self.assertEqual(order.payout_status, PayoutStatus.HELD)

    def test_go_live_gate_requires_verification(self):
        self.biz.verification_status = VerificationStatus.UNVERIFIED
        self.biz.save(update_fields=["verification_status"])
        from accounts.seller_trust import enforce_service_go_live, seller_may_go_live
        from rest_framework.exceptions import ValidationError

        self.assertFalse(seller_may_go_live(self.seller))
        with self.assertRaises(ValidationError):
            enforce_service_go_live(user=self.seller, wanting_active=True)