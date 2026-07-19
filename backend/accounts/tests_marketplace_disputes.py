from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.marketplace_payout import PayoutStatus
from accounts.models import MarketplaceDispute
from accommodation.models import AccommodationBooking, AccommodationListing
from shop.models import Order, OrderStatus

User = get_user_model()


class MarketplaceDisputeTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="disp_admin", email="disp_admin@test.local", password="pass12345", is_staff=True
        )
        self.buyer = User.objects.create_user(
            username="disp_buyer", email="disp_buyer@test.local", password="pass12345"
        )
        self.seller = User.objects.create_user(
            username="disp_seller", email="disp_seller@test.local", password="pass12345"
        )
        self.host = User.objects.create_user(
            username="disp_host", email="disp_host@test.local", password="pass12345"
        )
        self.order = Order.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            status=OrderStatus.PAID,
            items_total=Decimal("100.00"),
            shipping_total=Decimal("0"),
            total=Decimal("100.00"),
            platform_fee=Decimal("2.50"),
            seller_payout=Decimal("97.50"),
            payout_status=PayoutStatus.HELD,
            mock_payment_ref="mock_d1",
        )
        listing = AccommodationListing.objects.create(
            owner=self.host,
            title="Dispute Stay",
            region="Khomas",
            city="Windhoek",
            price_per_night=Decimal("500.00"),
            is_active=True,
        )
        self.stay = AccommodationBooking.objects.create(
            listing=listing,
            guest=self.buyer,
            check_in="2026-08-10",
            check_out="2026-08-12",
            guests=1,
            total_price=Decimal("1000.00"),
            status="confirmed",
            mock_payment_ref="mock_stay_d",
            platform_fee=Decimal("100.00"),
            seller_payout=Decimal("900.00"),
            payout_status=PayoutStatus.HELD,
        )

    def test_buyer_opens_shop_dispute(self):
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post(
            reverse("me-disputes"),
            {
                "source": "shop",
                "record_id": self.order.pk,
                "reason": "not_received",
                "body": "Package never arrived after two weeks.",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data["status"], MarketplaceDispute.Status.OPEN)
        self.assertEqual(MarketplaceDispute.objects.count(), 1)

    def test_duplicate_open_rejected(self):
        self.client.force_authenticate(user=self.buyer)
        payload = {
            "source": "shop",
            "record_id": self.order.pk,
            "reason": "other",
            "body": "First dispute description here.",
        }
        self.assertEqual(self.client.post(reverse("me-disputes"), payload, format="json").status_code, 201)
        again = self.client.post(reverse("me-disputes"), payload, format="json")
        self.assertEqual(again.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_queue_and_resolve_refund(self):
        self.client.force_authenticate(user=self.buyer)
        opened = self.client.post(
            reverse("me-disputes"),
            {
                "source": "accommodation",
                "record_id": self.stay.pk,
                "reason": "not_as_described",
                "body": "Room was completely different from listing photos.",
            },
            format="json",
        )
        self.assertEqual(opened.status_code, 201, opened.data)
        dispute_id = opened.data["id"]

        self.client.force_authenticate(user=self.admin)
        queue = self.client.get(reverse("platform-disputes"))
        self.assertEqual(queue.status_code, 200)
        self.assertTrue(any(r["id"] == dispute_id for r in queue.data))

        resolve = self.client.patch(
            reverse("platform-dispute-detail", kwargs={"pk": dispute_id}),
            {
                "status": "resolved",
                "resolution": "refund_buyer",
                "resolution_note": "Full refund approved.",
                "apply_money": True,
            },
            format="json",
        )
        self.assertEqual(resolve.status_code, 200, resolve.data)
        self.stay.refresh_from_db()
        self.assertEqual(self.stay.payout_status, PayoutStatus.REFUNDED)
