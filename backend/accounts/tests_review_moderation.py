from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import BusinessProfile, VerificationStatus
from shop.models import Order, OrderStatus, ProductReview, ShopProduct
from shop.review_services import product_reviews_payload, sync_product_rating

User = get_user_model()


class ReviewModerationTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="rev_admin", email="rev_admin@test.local", password="pass12345", is_staff=True
        )
        self.seller = User.objects.create_user(
            username="rev_seller", email="rev_seller@test.local", password="pass12345"
        )
        self.buyer = User.objects.create_user(
            username="rev_buyer", email="rev_buyer@test.local", password="pass12345"
        )
        BusinessProfile.objects.create(
            owner=self.seller,
            slug="rev-shop",
            business_name="Rev Shop",
            verification_status=VerificationStatus.VERIFIED,
        )
        self.product = ShopProduct.objects.create(
            owner=self.seller,
            name="Basket",
            price=Decimal("100.00"),
            is_active=True,
        )
        order = Order.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            status=OrderStatus.FULFILLED,
            items_total=Decimal("100.00"),
            shipping_total=Decimal("0"),
            total=Decimal("100.00"),
            platform_fee=Decimal("2.50"),
            seller_payout=Decimal("97.50"),
            payout_status="released",
        )
        self.review = ProductReview.objects.create(
            product=self.product,
            reviewer=self.buyer,
            order=order,
            rating=5,
            body="Great quality.",
        )
        sync_product_rating(self.product)

    def test_hide_removes_from_public_payload_and_rating(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            reverse("platform-reviews"),
            {"source": "shop", "review_id": self.review.pk, "action": "hide", "reason": "Spam"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertTrue(res.data["is_hidden"])

        self.review.refresh_from_db()
        self.product.refresh_from_db()
        self.assertTrue(self.review.is_hidden)
        self.assertEqual(self.product.rating_count, 0)

        payload = product_reviews_payload(self.product)
        self.assertEqual(len(payload["reviews"]), 0)

    def test_list_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse("platform-reviews"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(r["review_id"] == self.review.pk for r in res.data))
