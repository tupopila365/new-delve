from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from food.models import CuisineType, FoodVenue

User = get_user_model()


class FoodListingInspectorTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="food_admin",
            email="food_admin@test.local",
            password="pass12345",
            is_staff=True,
        )
        self.owner = User.objects.create_user(
            username="food_inspect_owner",
            email="food_inspect_owner@test.local",
            password="pass12345",
        )
        self.venue = FoodVenue.objects.create(
            owner=self.owner,
            name="Inspector Kitchen",
            cuisine=CuisineType.LOCAL,
            region="Khomas",
            city="Windhoek",
            reservations=True,
        )

    def test_platform_admin_can_inspect_food_listing(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/api/accounts/admin/listings/food/{self.venue.pk}/inspect/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["listing_type"], "food")
        self.assertEqual(res.data["title"], "Inspector Kitchen")
        self.assertEqual(res.data["owner_username"], "food_inspect_owner")
        self.assertTrue(res.data["reservations_enabled"])

    def test_inspector_not_found(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/accounts/admin/listings/food/99999/inspect/")
        self.assertEqual(res.status_code, 404)
