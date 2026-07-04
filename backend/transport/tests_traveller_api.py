"""Phase 3 — traveller transport API tests."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from accommodation.models import BookingStatus
from accounts.models import Profile
from transport.models import (
    BusOperator,
    BusRoute,
    BusTrip,
    SeatReservation,
    VehicleRentalBooking,
    VehicleRentalListing,
)

User = get_user_model()


class TravellerTransportApiTests(__import__("django").test.TestCase):
    def setUp(self):
        self.client = APIClient()
        self.provider = User.objects.create_user(
            username="tp_owner",
            email="owner@test.local",
            password="pass12345",
        )
        self.traveler = User.objects.create_user(
            username="tp_guest",
            email="guest@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.traveler).update(email_verified=True)
        self.traveler.profile.refresh_from_db()
        self.vehicle = VehicleRentalListing.objects.create(
            owner=self.provider,
            title="Safari Hilux",
            make="Toyota",
            model="Hilux",
            year=2022,
            transmission="manual",
            seats=5,
            vehicle_type="4x4",
            price_per_day="850.00",
            region="Khomas",
            city="Windhoek",
            is_active=True,
        )
        self.operator = BusOperator.objects.create(owner=self.provider, name="Desert Link", region="Khomas")
        self.route = BusRoute.objects.create(operator=self.operator, origin="Windhoek", destination="Swakopmund")
        self.trip = BusTrip.objects.create(
            route=self.route,
            departs_at=timezone.now() + timedelta(days=4),
            arrives_at=timezone.now() + timedelta(days=4, hours=5),
            price="180.00",
            total_seats=20,
            is_active=True,
        )
        self.rental = VehicleRentalBooking.objects.create(
            listing=self.vehicle,
            renter=self.traveler,
            start_date=(timezone.now() + timedelta(days=6)).date(),
            end_date=(timezone.now() + timedelta(days=8)).date(),
            total_price="2550.00",
            status=BookingStatus.PENDING,
        )
        self.seat = SeatReservation.objects.create(
            trip=self.trip,
            passenger=self.traveler,
            seat_number=4,
            status=BookingStatus.PENDING,
        )

    def test_list_my_vehicle_bookings(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.get("/api/transport/vehicle-bookings/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["listing_title"], "Safari Hilux")
        self.assertEqual(res.data[0]["listing_owner_username"], "tp_owner")

    def test_list_my_seat_reservations(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.get("/api/transport/bus/reservations/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["route_label"], "Windhoek → Swakopmund")
        self.assertEqual(res.data[0]["seat_number"], 4)

    def test_unverified_user_cannot_book_vehicle(self):
        Profile.objects.filter(user=self.traveler).update(email_verified=False)
        self.traveler.profile.refresh_from_db()
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            "/api/transport/vehicle-bookings/",
            {
                "listing": self.vehicle.id,
                "start_date": (timezone.now() + timedelta(days=10)).date().isoformat(),
                "end_date": (timezone.now() + timedelta(days=12)).date().isoformat(),
            },
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_cancel_vehicle_booking(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(f"/api/transport/vehicle-bookings/{self.rental.id}/cancel/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], BookingStatus.CANCELLED)

    def test_cancel_seat_reservation(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(f"/api/transport/bus/reservations/{self.seat.id}/cancel/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], BookingStatus.CANCELLED)

    def test_adjacent_seat_block_required(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            "/api/transport/bus/reservations/",
            {"trip": self.trip.id, "seat_numbers": [7, 9]},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_seat_block_rejects_taken_seat(self):
        SeatReservation.objects.create(
            trip=self.trip,
            passenger=self.provider,
            seat_number=10,
            status=BookingStatus.CONFIRMED,
        )
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            "/api/transport/bus/reservations/",
            {"trip": self.trip.id, "seat_numbers": [9, 10]},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
