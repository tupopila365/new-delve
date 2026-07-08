"""Food review eligibility after seated reservations (Phase 5)."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accommodation.models import BookingStatus
from accounts.models import Profile, UserType
from food.models import CuisineType, FoodReservation, FoodVenue

User = get_user_model()


class FoodReviewGateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.traveler = User.objects.create_user(
            username="food_gate_guest",
            email="food_gate_guest@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.traveler).update(email_verified=True, user_type=UserType.NORMAL)
        self.traveler.profile.refresh_from_db()
        self.owner = User.objects.create_user(
            username="food_gate_host",
            email="food_gate_host@test.local",
            password="pass12345",
        )
        self.owner.profile.user_type = UserType.SERVICE_PROVIDER
        self.owner.profile.save()
        self.venue = FoodVenue.objects.create(
            owner=self.owner,
            name="Table Service Bistro",
            cuisine=CuisineType.GRILL,
            region="Khomas",
            city="Windhoek",
            reservations=True,
            is_active=True,
        )
        self.reserved_for = (timezone.now() + timedelta(days=1)).replace(
            hour=19, minute=0, second=0, microsecond=0
        )

    def test_reservation_venue_requires_seated_visit_to_review(self):
        FoodReservation.objects.create(
            venue=self.venue,
            guest=self.traveler,
            reserved_for=self.reserved_for,
            party_size=2,
            status=BookingStatus.CONFIRMED,
        )
        self.client.force_authenticate(user=self.traveler)
        blocked = self.client.post(
            f"/api/food/venues/{self.venue.pk}/review/",
            {"rating": 5, "body": "Too early"},
            format="json",
        )
        self.assertEqual(blocked.status_code, 400)

        detail = self.client.get(f"/api/food/venues/{self.venue.pk}/")
        self.assertFalse(detail.data["can_review"])

    def test_seated_reservation_unlocks_review(self):
        FoodReservation.objects.create(
            venue=self.venue,
            guest=self.traveler,
            reserved_for=self.reserved_for,
            party_size=2,
            status=BookingStatus.CHECKED_IN,
        )
        self.client.force_authenticate(user=self.traveler)
        detail = self.client.get(f"/api/food/venues/{self.venue.pk}/")
        self.assertTrue(detail.data["can_review"])

        created = self.client.post(
            f"/api/food/venues/{self.venue.pk}/review/",
            {"rating": 5, "body": "Wonderful evening."},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertFalse(self.client.get(f"/api/food/venues/{self.venue.pk}/").data["can_review"])
