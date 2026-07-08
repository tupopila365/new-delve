from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from food.models import CuisineType, FoodVenue, FoodVenueSave

User = get_user_model()


class FoodVenueSaveTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="food_owner",
            email="food_owner@test.local",
            password="pass12345",
        )
        self.traveler = User.objects.create_user(
            username="food_traveler",
            email="food_traveler@test.local",
            password="pass12345",
        )
        self.venue = FoodVenue.objects.create(
            owner=self.owner,
            name="River Café",
            cuisine=CuisineType.CAFE,
            region="Khomas",
            city="Windhoek",
            is_active=True,
        )

    def test_save_toggle_and_saved_list(self):
        self.client.force_authenticate(user=self.traveler)

        save_url = f"/api/food/venues/{self.venue.pk}/save/"
        res = self.client.post(save_url)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["saved"])
        self.assertEqual(res.data["saves_count"], 1)
        self.assertTrue(
            FoodVenueSave.objects.filter(venue=self.venue, user=self.traveler).exists()
        )

        detail = self.client.get(f"/api/food/venues/{self.venue.pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertTrue(detail.data["saved_by_me"])
        self.assertEqual(detail.data["saves_count"], 1)

        saved_list = self.client.get("/api/food/venues/saved/")
        self.assertEqual(saved_list.status_code, 200)
        self.assertEqual(len(saved_list.data), 1)
        self.assertEqual(saved_list.data[0]["id"], self.venue.pk)

        unsave = self.client.post(save_url)
        self.assertEqual(unsave.status_code, 200)
        self.assertFalse(unsave.data["saved"])
        self.assertEqual(unsave.data["saves_count"], 0)

        saved_empty = self.client.get("/api/food/venues/saved/")
        self.assertEqual(len(saved_empty.data), 0)

    def test_save_requires_auth(self):
        res = self.client.post(f"/api/food/venues/{self.venue.pk}/save/")
        self.assertEqual(res.status_code, 401)
