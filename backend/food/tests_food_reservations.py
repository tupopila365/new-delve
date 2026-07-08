"""Food table reservations (Phase 4)."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accommodation.models import BookingStatus
from accounts.models import Profile, UserType
from food.models import CuisineType, FoodReservation, FoodVenue

User = get_user_model()


class FoodReservationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.traveler = User.objects.create_user(
            username="food_guest",
            email="food_guest@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.traveler).update(email_verified=True, user_type=UserType.NORMAL)
        self.traveler.profile.refresh_from_db()
        self.owner = User.objects.create_user(
            username="food_host",
            email="food_host@test.local",
            password="pass12345",
        )
        self.owner.profile.user_type = UserType.SERVICE_PROVIDER
        self.owner.profile.save()
        self.venue = FoodVenue.objects.create(
            owner=self.owner,
            name="Sunset Bistro",
            cuisine=CuisineType.INTERNATIONAL,
            region="Erongo",
            city="Swakopmund",
            reservations=True,
            is_active=True,
        )
        self.reserved_for = (timezone.now() + timedelta(days=2)).replace(
            hour=19, minute=0, second=0, microsecond=0
        )

    def test_traveler_can_request_table(self):
        self.client.force_authenticate(user=self.traveler)
        created = self.client.post(
            "/api/food/reservations/",
            {
                "venue": self.venue.pk,
                "reserved_for": self.reserved_for.isoformat(),
                "party_size": 4,
                "special_requests": "Window seat if possible",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["status"], BookingStatus.PENDING)
        self.assertEqual(created.data["party_size"], 4)

        listed = self.client.get("/api/food/reservations/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)

    def test_provider_can_confirm_reservation(self):
        reservation = FoodReservation.objects.create(
            venue=self.venue,
            guest=self.traveler,
            reserved_for=self.reserved_for,
            party_size=2,
            status=BookingStatus.PENDING,
        )
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f"/api/food/provider-reservations/{reservation.pk}/confirm/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], BookingStatus.CONFIRMED)

        reservation.refresh_from_db()
        self.assertEqual(reservation.status, BookingStatus.CONFIRMED)

    def test_traveler_can_cancel_pending_reservation(self):
        reservation = FoodReservation.objects.create(
            venue=self.venue,
            guest=self.traveler,
            reserved_for=self.reserved_for,
            party_size=2,
            status=BookingStatus.PENDING,
        )
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(f"/api/food/reservations/{reservation.pk}/cancel/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], BookingStatus.CANCELLED)

    def test_cannot_reserve_when_venue_disabled(self):
        self.venue.reservations = False
        self.venue.save(update_fields=["reservations"])
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            "/api/food/reservations/",
            {
                "venue": self.venue.pk,
                "reserved_for": self.reserved_for.isoformat(),
                "party_size": 2,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)
