"""Admin CRUD for purchasable promotion packages."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Profile
from promotions.models import PromotionPlacement, PromotionProduct

User = get_user_model()


class PromotionProductAdminApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="promo_admin",
            email="promo-admin@test.local",
            password="Pass12345!",
            is_staff=True,
        )
        Profile.objects.filter(user=self.admin).update(email_verified=True)
        self.client.force_authenticate(user=self.admin)

    def test_create_list_and_deactivate_product(self):
        create = self.client.post(
            "/api/accounts/admin/promotion-products/",
            {
                "name": "Homepage featured 7 days — Food — Erongo",
                "description": "Featured on the homepage food rail",
                "placement": PromotionPlacement.HOMEPAGE_FOOD,
                "region": "Erongo",
                "duration_days": 7,
                "price_cents": 180_000,
                "currency": "NAD",
            },
            format="json",
        )
        self.assertEqual(create.status_code, 201, create.data)
        product_id = create.data["id"]
        self.assertTrue(create.data["is_active"])
        self.assertEqual(create.data["price_display"], "N$1,800.00")

        listed = self.client.get("/api/accounts/admin/promotion-products/")
        self.assertEqual(listed.status_code, 200)
        self.assertTrue(any(p["id"] == product_id for p in listed.data))

        public = self.client.get("/api/promotions/products/")
        self.assertEqual(public.status_code, 200)
        self.assertTrue(any(p["id"] == product_id for p in public.data))

        deactivate = self.client.delete(f"/api/accounts/admin/promotion-products/{product_id}/")
        self.assertEqual(deactivate.status_code, 200)
        self.assertFalse(deactivate.data["is_active"])
        self.assertFalse(PromotionProduct.objects.get(pk=product_id).is_active)

        public_after = self.client.get("/api/promotions/products/")
        self.assertFalse(any(p["id"] == product_id for p in public_after.data))

    def test_non_staff_forbidden(self):
        host = User.objects.create_user(
            username="promo_host",
            email="promo-host@test.local",
            password="Pass12345!",
        )
        self.client.force_authenticate(user=host)
        res = self.client.get("/api/accounts/admin/promotion-products/")
        self.assertEqual(res.status_code, 403)
