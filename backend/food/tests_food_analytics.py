from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accommodation.models import BookingStatus
from accounts.models import Profile, UserType
from food.models import CuisineType, FoodReservation, FoodVenue, FoodVenueSave

User = get_user_model()


class FoodProviderAnalyticsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="food_analytics_host",
            email="food_analytics_host@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.owner).update(user_type=UserType.SERVICE_PROVIDER)
        self.owner.profile.refresh_from_db()
        self.venue = FoodVenue.objects.create(
            owner=self.owner,
            name="Analytics Bistro",
            cuisine=CuisineType.GRILL,
            region="Erongo",
            city="Swakopmund",
            reservations=True,
        )
        self.traveler = User.objects.create_user(
            username="food_analytics_guest",
            email="food_analytics_guest@test.local",
            password="pass12345",
        )
        FoodVenueSave.objects.create(venue=self.venue, user=self.traveler)
        FoodReservation.objects.create(
            venue=self.venue,
            guest=self.traveler,
            party_size=2,
            reserved_for=timezone.now() + timedelta(days=1),
            status=BookingStatus.CONFIRMED,
        )

    def test_provider_analytics_summary(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/food/provider-analytics/?days=30")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total_saves"], 1)
        self.assertEqual(res.data["total_reservations"], 1)
        self.assertEqual(res.data["confirmed_reservations"], 1)
        self.assertEqual(len(res.data["venues"]), 1)
        self.assertEqual(res.data["venues"][0]["name"], "Analytics Bistro")
        self.assertEqual(res.data["venues"][0]["saves_count"], 1)
