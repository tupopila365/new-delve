"""Phase 8 — transport Delvers moments and traveller reviews."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accommodation.models import BookingStatus
from accounts.models import Profile, UserType
from transport.models import (
    BusOperator,
    BusRoute,
    BusTrip,
    SeatReservation,
    VehicleRentalBooking,
    VehicleRentalListing,
)

User = get_user_model()


class TransportSocialReviewsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.traveler = User.objects.create_user(
            username="transport_reviewer",
            email="rev@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.traveler).update(email_verified=True, user_type=UserType.NORMAL)
        self.traveler.profile.refresh_from_db()
        self.provider = User.objects.create_user(
            username="transport_host",
            email="host@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.provider).update(user_type=UserType.SERVICE_PROVIDER)
        self.vehicle = VehicleRentalListing.objects.create(
            owner=self.provider,
            title="Review Hilux",
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
        self.operator = BusOperator.objects.create(owner=self.provider, name="Review Coaches", region="Khomas")
        self.route = BusRoute.objects.create(operator=self.operator, origin="Windhoek", destination="Oshakati")
        self.trip = BusTrip.objects.create(
            route=self.route,
            departs_at=timezone.now() + timedelta(days=2),
            arrives_at=timezone.now() + timedelta(days=2, hours=5),
            price="200.00",
            total_seats=40,
            is_active=True,
        )
        self.vehicle_booking = VehicleRentalBooking.objects.create(
            listing=self.vehicle,
            renter=self.traveler,
            start_date=(timezone.now().date() + timedelta(days=1)),
            end_date=(timezone.now().date() + timedelta(days=3)),
            total_price="1800.00",
            status=BookingStatus.CHECKED_OUT,
        )
        self.seat = SeatReservation.objects.create(
            trip=self.trip,
            passenger=self.traveler,
            seat_number=12,
            status=BookingStatus.CHECKED_OUT,
        )

    def test_delvers_post_links_to_vehicle_and_appears_in_moments(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            "/api/social/posts/",
            {
                "body": "Great gravel roads in the Hilux",
                "region": "Khomas",
                "is_delvers": True,
                "vehicle_listing": self.vehicle.pk,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        moments = self.client.get(f"/api/transport/vehicles/{self.vehicle.pk}/moments/")
        self.assertEqual(moments.status_code, 200)
        self.assertEqual(len(moments.data), 1)
        self.assertEqual(moments.data[0]["body"], "Great gravel roads in the Hilux")

    def test_delvers_post_links_to_bus_trip_and_appears_in_moments(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            "/api/social/posts/",
            {
                "body": "Smooth ride north",
                "region": "Khomas",
                "is_delvers": True,
                "bus_trip": self.trip.pk,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        moments = self.client.get(f"/api/transport/bus/trips/{self.trip.pk}/moments/")
        self.assertEqual(moments.status_code, 200)
        self.assertEqual(len(moments.data), 1)

    def test_vehicle_review_after_checked_out_booking(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            f"/api/transport/vehicle-bookings/{self.vehicle_booking.pk}/review/",
            {"rating": 5, "body": "Clean vehicle and easy pickup."},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        reviews = self.client.get(f"/api/transport/vehicles/{self.vehicle.pk}/reviews/")
        self.assertEqual(reviews.status_code, 200)
        self.assertEqual(reviews.data["rating_count"], 1)
        self.assertTrue(any(r.get("source") == "traveler" for r in reviews.data["reviews"]))
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.rating_count, 1)

    def test_seat_review_after_checked_out_trip(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            f"/api/transport/bus/reservations/{self.seat.pk}/review/",
            {"rating": 4, "body": "On time and comfortable."},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        reviews = self.client.get(f"/api/transport/bus/trips/{self.trip.pk}/reviews/")
        self.assertEqual(reviews.status_code, 200)
        self.assertEqual(reviews.data["rating_count"], 1)

    def test_cannot_link_multiple_places_on_post(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            "/api/social/posts/",
            {
                "body": "Invalid",
                "is_delvers": True,
                "vehicle_listing": self.vehicle.pk,
                "bus_trip": self.trip.pk,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)
