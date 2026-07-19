"""Food venue traveler reviews (Phase 3 / Phase 6 eligibility)."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accommodation.models import BookingStatus
from accounts.models import Profile, UserType
from food.models import CuisineType, FoodReservation, FoodVenue, FoodVenueReview

User = get_user_model()


class FoodVenueReviewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.traveler = User.objects.create_user(
            username="food_reviewer",
            email="food_reviewer@test.local",
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
            reservations=True,
            guest_reviews=[
                {
                    "name": "Seed Guest",
                    "place": "Windhoek",
                    "rating": 4,
                    "body": "Lovely brunch spot.",
                }
            ],
            rating_avg=4.0,
            rating_count=1,
            is_active=True,
        )
        FoodReservation.objects.create(
            venue=self.venue,
            guest=self.traveler,
            reserved_for=(timezone.now() - timedelta(days=1)).replace(
                hour=12, minute=0, second=0, microsecond=0
            ),
            party_size=2,
            status=BookingStatus.CHECKED_OUT,
        )

    def test_traveler_can_review_venue_once(self):
        self.client.force_authenticate(user=self.traveler)
        created = self.client.post(
            f"/api/food/venues/{self.venue.pk}/review/",
            {"rating": 5, "body": "Excellent coffee and pastries."},
            format="json",
        )
        self.assertEqual(created.status_code, 201)

        payload = self.client.get(f"/api/food/venues/{self.venue.pk}/reviews/")
        self.assertEqual(payload.status_code, 200)
        self.assertEqual(payload.data["rating_count"], 2)
        self.assertTrue(any(r.get("source") == "traveler" for r in payload.data["reviews"]))

        detail = self.client.get(f"/api/food/venues/{self.venue.pk}/")
        self.assertTrue(detail.data["has_reviewed"])

        duplicate = self.client.post(
            f"/api/food/venues/{self.venue.pk}/review/",
            {"rating": 4, "body": "Again"},
            format="json",
        )
        self.assertEqual(duplicate.status_code, 400)

    def test_unverified_user_cannot_review(self):
        Profile.objects.filter(user=self.traveler).update(email_verified=False)
        self.traveler.refresh_from_db()
        self.traveler.profile.refresh_from_db()
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            f"/api/food/venues/{self.venue.pk}/review/",
            {"rating": 5, "body": "Nope"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_review_updates_listing_rating(self):
        self.client.force_authenticate(user=self.traveler)
        self.client.post(
            f"/api/food/venues/{self.venue.pk}/review/",
            {"rating": 5, "body": "Great"},
            format="json",
        )
        self.venue.refresh_from_db()
        self.assertEqual(self.venue.rating_count, 2)
        self.assertEqual(float(self.venue.rating_avg), 4.5)
        self.assertEqual(FoodVenueReview.objects.filter(venue=self.venue).count(), 1)

    def test_walk_in_venue_without_reservation_cannot_review(self):
        self.venue.reservations = False
        self.venue.save(update_fields=["reservations"])
        FoodReservation.objects.filter(venue=self.venue).delete()
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            f"/api/food/venues/{self.venue.pk}/review/",
            {"rating": 5, "body": "Walk-in only"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        detail = self.client.get(f"/api/food/venues/{self.venue.pk}/")
        self.assertFalse(detail.data["can_review"])
