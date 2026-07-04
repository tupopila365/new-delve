"""Phase 2 — food Delvers moments and place links."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Profile, UserType
from transport.models import VehicleRentalListing

from food.models import CuisineType, FoodVenue

User = get_user_model()


class FoodSocialMomentsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.traveler = User.objects.create_user(
            username="food_traveler",
            email="food_traveler@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.traveler).update(email_verified=True, user_type=UserType.NORMAL)
        self.traveler.profile.refresh_from_db()
        self.owner = User.objects.create_user(
            username="food_owner",
            email="food_owner@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.owner).update(user_type=UserType.SERVICE_PROVIDER)
        self.venue = FoodVenue.objects.create(
            owner=self.owner,
            name="River Cafe",
            cuisine=CuisineType.CAFE,
            region="Khomas",
            city="Windhoek",
            is_active=True,
        )
        self.vehicle = VehicleRentalListing.objects.create(
            owner=self.owner,
            title="Extra link",
            make="Toyota",
            model="Hilux",
            year=2021,
            transmission="manual",
            seats=5,
            vehicle_type="4x4",
            price_per_day="900.00",
            region="Khomas",
            city="Windhoek",
            is_active=True,
        )

    def test_delvers_post_links_to_food_venue_and_appears_in_moments(self):
        self.client.force_authenticate(user=self.traveler)
        created = self.client.post(
            "/api/social/posts/",
            {
                "body": "Best flat white in town.",
                "region": "Khomas",
                "is_delvers": True,
                "food_venue": self.venue.pk,
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["food_venue"]["id"], self.venue.pk)

        self.client.force_authenticate(user=None)
        moments = self.client.get(f"/api/food/venues/{self.venue.pk}/moments/")
        self.assertEqual(moments.status_code, 200)
        self.assertEqual(len(moments.data), 1)
        self.assertEqual(moments.data[0]["body"], "Best flat white in town.")

    def test_cannot_link_multiple_places_on_post(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            "/api/social/posts/",
            {
                "body": "Too many links",
                "region": "Khomas",
                "is_delvers": True,
                "food_venue": self.venue.pk,
                "vehicle_listing": self.vehicle.pk,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_inactive_food_venue_cannot_be_linked(self):
        self.venue.is_active = False
        self.venue.save(update_fields=["is_active"])
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            "/api/social/posts/",
            {
                "body": "Should fail",
                "region": "Khomas",
                "food_venue": self.venue.pk,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)
