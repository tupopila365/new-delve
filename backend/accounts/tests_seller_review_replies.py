from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import BusinessProfile, Profile, UserType, VerificationStatus
from shop.models import Order, OrderStatus, ProductReview, ShopProduct
from shop.review_services import product_reviews_payload, sync_product_rating

User = get_user_model()


class SellerReviewReplyTests(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            username="reply_seller", email="reply_seller@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.seller).update(user_type=UserType.SERVICE_PROVIDER)
        self.buyer = User.objects.create_user(
            username="reply_buyer", email="reply_buyer@test.local", password="pass12345"
        )
        self.other = User.objects.create_user(
            username="reply_other", email="reply_other@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.other).update(user_type=UserType.SERVICE_PROVIDER)
        BusinessProfile.objects.create(
            owner=self.seller,
            slug="reply-shop",
            business_name="Reply Shop",
            verification_status=VerificationStatus.VERIFIED,
        )
        self.product = ShopProduct.objects.create(
            owner=self.seller,
            name="Bowl",
            price=Decimal("80.00"),
            is_active=True,
        )
        order = Order.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            status=OrderStatus.FULFILLED,
            items_total=Decimal("80.00"),
            shipping_total=Decimal("0"),
            total=Decimal("80.00"),
            platform_fee=Decimal("2.00"),
            seller_payout=Decimal("78.00"),
            payout_status="released",
        )
        self.review = ProductReview.objects.create(
            product=self.product,
            reviewer=self.buyer,
            order=order,
            rating=4,
            body="Solid craftsmanship.",
        )
        sync_product_rating(self.product)

    def test_provider_can_reply_and_public_payload_shows_it(self):
        self.client.force_authenticate(user=self.seller)
        res = self.client.post(
            reverse("provider-review-reply", kwargs={"source": "shop", "review_id": self.review.pk}),
            {"reply": "Thanks for shopping with us!"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data["seller_reply"], "Thanks for shopping with us!")
        self.assertFalse(res.data["needs_reply"])

        self.review.refresh_from_db()
        self.assertTrue(self.review.seller_reply)
        self.assertIsNotNone(self.review.seller_replied_at)

        payload = product_reviews_payload(self.product)
        self.assertEqual(payload["reviews"][0]["seller_reply"], "Thanks for shopping with us!")

    def test_list_provider_reviews(self):
        self.client.force_authenticate(user=self.seller)
        res = self.client.get(reverse("provider-reviews"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(r["review_id"] == self.review.pk for r in res.data))

    def test_other_provider_cannot_reply(self):
        self.client.force_authenticate(user=self.other)
        res = self.client.post(
            reverse("provider-review-reply", kwargs={"source": "shop", "review_id": self.review.pk}),
            {"reply": "Nope"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_clear_reply(self):
        self.review.seller_reply = "Old"
        self.review.save(update_fields=["seller_reply"])
        self.client.force_authenticate(user=self.seller)
        res = self.client.post(
            reverse("provider-review-reply", kwargs={"source": "shop", "review_id": self.review.pk}),
            {"reply": ""},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data["seller_reply"], "")
        self.assertTrue(res.data["needs_reply"])
        self.review.refresh_from_db()
        self.assertEqual(self.review.seller_reply, "")
        self.assertIsNone(self.review.seller_replied_at)
