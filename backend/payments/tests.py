from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.marketplace_payout import PayoutStatus
from accommodation.models import AccommodationBooking, AccommodationListing
from payments.models import SimulatedPaymentIntent
from shop.models import Order, OrderStatus

User = get_user_model()


class StripeSimPaymentTests(APITestCase):
    def setUp(self):
        self.buyer = User.objects.create_user(
            username="sim_buyer", email="sim_buyer@test.local", password="pass12345"
        )
        self.seller = User.objects.create_user(
            username="sim_seller", email="sim_seller@test.local", password="pass12345"
        )
        self.host = User.objects.create_user(
            username="sim_host", email="sim_host@test.local", password="pass12345"
        )
        self.order = Order.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            status=OrderStatus.PENDING,
            items_total=Decimal("100.00"),
            shipping_total=Decimal("0"),
            total=Decimal("100.00"),
            platform_fee=Decimal("0"),
            seller_payout=Decimal("0"),
            payout_status=PayoutStatus.NONE,
        )
        listing = AccommodationListing.objects.create(
            owner=self.host,
            title="Sim Stay",
            region="Khomas",
            city="Windhoek",
            price_per_night=Decimal("500.00"),
            is_active=True,
        )
        self.stay = AccommodationBooking.objects.create(
            listing=listing,
            guest=self.buyer,
            check_in="2026-09-10",
            check_out="2026-09-12",
            guests=1,
            total_price=Decimal("1000.00"),
            status="confirmed",
        )

    def test_shop_success_card_holds_funds(self):
        self.client.force_authenticate(user=self.buyer)
        created = self.client.post(
            reverse("payment-intent-create"),
            {"target_type": "shop_order", "target_id": self.order.order_ref},
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        pi_id = created.data["id"]
        self.assertTrue(str(pi_id).startswith("pi_sim_"))

        confirmed = self.client.post(
            reverse("payment-intent-confirm", kwargs={"stripe_id": pi_id}),
            {"card_number": "4242 4242 4242 4242", "exp_month": "12", "exp_year": "34", "cvc": "123"},
            format="json",
        )
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK, confirmed.data)
        self.assertEqual(confirmed.data["status"], "succeeded")

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.PAID)
        self.assertEqual(self.order.mock_payment_ref, pi_id)
        self.assertEqual(self.order.payout_status, PayoutStatus.HELD)
        self.assertEqual(self.order.platform_fee, Decimal("2.50"))

    def test_decline_card_does_not_hold(self):
        self.client.force_authenticate(user=self.buyer)
        created = self.client.post(
            reverse("payment-intent-create"),
            {"target_type": "shop_order", "target_id": self.order.order_ref},
            format="json",
        )
        pi_id = created.data["id"]
        declined = self.client.post(
            reverse("payment-intent-confirm", kwargs={"stripe_id": pi_id}),
            {"card_number": "4000000000000002"},
            format="json",
        )
        self.assertEqual(declined.status_code, status.HTTP_402_PAYMENT_REQUIRED, declined.data)
        self.assertEqual(declined.data["status"], "failed")

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.PENDING)
        self.assertFalse(self.order.mock_payment_ref)
        self.assertEqual(self.order.payout_status, PayoutStatus.NONE)

    def test_stay_success_holds_booking(self):
        self.client.force_authenticate(user=self.buyer)
        created = self.client.post(
            reverse("payment-intent-create"),
            {"target_type": "accommodation", "target_id": str(self.stay.pk)},
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        pi_id = created.data["id"]
        confirmed = self.client.post(
            reverse("payment-intent-confirm", kwargs={"stripe_id": pi_id}),
            {"card_number": "4242424242424242"},
            format="json",
        )
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK, confirmed.data)
        self.stay.refresh_from_db()
        self.assertEqual(self.stay.mock_payment_ref, pi_id)
        self.assertEqual(self.stay.payout_status, PayoutStatus.HELD)
        self.assertEqual(self.stay.platform_fee, Decimal("100.00"))
        self.assertTrue(SimulatedPaymentIntent.objects.filter(stripe_id=pi_id, status="succeeded").exists())
