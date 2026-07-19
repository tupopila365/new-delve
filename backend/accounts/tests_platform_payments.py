from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.marketplace_payout import PayoutStatus
from accommodation.models import AccommodationBooking, AccommodationListing
from shop.models import Order, OrderStatus

User = get_user_model()


class PlatformPaymentsDeskTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="ops_admin", email="ops@test.local", password="pass12345", is_staff=True
        )
        self.buyer = User.objects.create_user(username="buyer_ops", email="buyer@test.local", password="pass12345")
        self.seller = User.objects.create_user(username="seller_ops", email="seller@test.local", password="pass12345")
        self.host = User.objects.create_user(username="host_ops", email="host@test.local", password="pass12345")

        listing = AccommodationListing.objects.create(
            owner=self.host,
            title="Ops Stay",
            region="Khomas",
            city="Windhoek",
            price_per_night=Decimal("1000.00"),
            is_active=True,
        )
        self.stay = AccommodationBooking.objects.create(
            listing=listing,
            guest=self.buyer,
            check_in="2026-08-01",
            check_out="2026-08-03",
            guests=2,
            total_price=Decimal("2000.00"),
            status="confirmed",
            mock_payment_ref="mock_stay_1",
            platform_fee=Decimal("200.00"),
            seller_payout=Decimal("1800.00"),
            payout_status=PayoutStatus.HELD,
        )
        self.order = Order.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            status=OrderStatus.PAID,
            items_total=Decimal("100.00"),
            shipping_total=Decimal("20.00"),
            total=Decimal("120.00"),
            platform_fee=Decimal("2.50"),
            seller_payout=Decimal("117.50"),
            payout_status=PayoutStatus.HELD,
            mock_payment_ref="mock_shop_1",
        )
        AccommodationBooking.objects.create(
            listing=listing,
            guest=self.buyer,
            check_in="2026-09-01",
            check_out="2026-09-02",
            guests=1,
            total_price=Decimal("1000.00"),
            status="pending",
            payout_status=PayoutStatus.NONE,
        )

    def test_list_requires_staff(self):
        self.client.force_authenticate(user=self.buyer)
        res = self.client.get(reverse("platform-payments"))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_defaults_to_active_money(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse("platform-payments"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in res.data}
        self.assertIn(f"shop:{self.order.pk}", ids)
        self.assertIn(f"accommodation:{self.stay.pk}", ids)
        self.assertTrue(all(row["payout_status"] != PayoutStatus.NONE for row in res.data))
        held = [row for row in res.data if row["payout_status"] == PayoutStatus.HELD]
        self.assertGreaterEqual(len(held), 2)

    def test_filter_by_source_and_payout(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse("platform-payments"), {"source": "shop", "payout_status": "held"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["source"], "shop")
        self.assertEqual(res.data[0]["seller_payout"], "117.50")

    def test_payment_detail(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(
            reverse("platform-payment-detail", kwargs={"source": "accommodation", "record_id": self.stay.pk})
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["payout_status"], PayoutStatus.HELD)
        self.assertEqual(res.data["platform_fee"], "200.00")
        self.assertEqual(res.data["buyer_username"], "buyer_ops")
        self.assertEqual(res.data["seller_username"], "host_ops")
