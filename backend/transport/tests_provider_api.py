"""Phase 1 — provider transport API tests."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from accommodation.models import BookingStatus
from accounts.models import BusinessProfile, Profile, UserType
from transport.models import (
    BusOperator,
    BusRoute,
    BusTrip,
    SeatReservation,
    VehicleRentalBooking,
    VehicleRentalListing,
)

User = get_user_model()


class ProviderTransportApiTests:
    def setUp(self):
        self.client = APIClient()
        self.provider = User.objects.create_user(
            username="transport_owner",
            email="transport@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.provider).update(user_type=UserType.SERVICE_PROVIDER)
        self.provider.profile.refresh_from_db()
        BusinessProfile.objects.create(
            owner=self.provider,
            slug="transport-co",
            business_name="Transport Co",
            business_types=["transport"],
            transport_modes=["rental", "shared"],
        )
        self.traveler = User.objects.create_user(
            username="transport_guest",
            email="guest@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.traveler).update(email_verified=True)
        self.traveler.profile.refresh_from_db()
        self.vehicle = VehicleRentalListing.objects.create(
            owner=self.provider,
            title="Test Hilux",
            make="Toyota",
            model="Hilux",
            year=2022,
            transmission="manual",
            seats=5,
            vehicle_type="4x4",
            price_per_day="850.00",
            region="Khomas",
            city="Windhoek",
            gallery_images=["https://example.com/hilux.jpg"],
            is_active=True,
        )
        self.operator = BusOperator.objects.create(
            owner=self.provider,
            name="Namibia Link",
            region="Khomas",
        )
        self.route = BusRoute.objects.create(
            operator=self.operator,
            origin="Windhoek",
            destination="Swakopmund",
            cover_image="https://example.com/bus.jpg",
        )
        self.trip = BusTrip.objects.create(
            route=self.route,
            departs_at=timezone.now() + timedelta(days=3),
            arrives_at=timezone.now() + timedelta(days=3, hours=5),
            price="180.00",
            total_seats=32,
            amenities=["Air conditioning"],
            is_active=True,
        )
        VehicleRentalBooking.objects.create(
            listing=self.vehicle,
            renter=self.traveler,
            start_date=(timezone.now() + timedelta(days=5)).date(),
            end_date=(timezone.now() + timedelta(days=7)).date(),
            total_price="1700.00",
            status=BookingStatus.CONFIRMED,
        )
        SeatReservation.objects.create(
            trip=self.trip,
            passenger=self.traveler,
            seat_number=7,
            status=BookingStatus.CONFIRMED,
        )


class ProviderVehicleApiTests(ProviderTransportApiTests, __import__("django").test.TestCase):
    def test_list_provider_vehicles(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.get("/api/transport/provider-vehicles/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["title"], "Test Hilux")
        self.assertEqual(res.data[0]["cover_image"], "https://example.com/hilux.jpg")

    def test_create_provider_vehicle(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.post(
            "/api/transport/provider-vehicles/",
            {
                "title": "VW Polo",
                "make": "VW",
                "model": "Polo",
                "year": 2021,
                "transmission": "automatic",
                "seats": 5,
                "vehicle_type": "hatchback",
                "price_per_day": "450.00",
                "region": "Erongo",
                "city": "Swakopmund",
                "cover_image": "https://example.com/polo.jpg",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["title"], "VW Polo")
        self.assertTrue(VehicleRentalListing.objects.filter(title="VW Polo").exists())

    def test_patch_provider_vehicle(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.patch(
            f"/api/transport/provider-vehicles/{self.vehicle.id}/",
            {"title": "Updated Hilux", "is_active": False},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.title, "Updated Hilux")
        self.assertFalse(self.vehicle.is_active)


class ProviderBusTripApiTests(ProviderTransportApiTests, __import__("django").test.TestCase):
    def test_list_provider_bus_trips(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.get("/api/transport/provider-bus-trips/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["route_detail"]["origin"], "Windhoek")

    def test_create_provider_bus_trip(self):
        self.client.force_authenticate(user=self.provider)
        departs = timezone.now() + timedelta(days=10)
        arrives = departs + timedelta(hours=6)
        res = self.client.post(
            "/api/transport/provider-bus-trips/",
            {
                "route_detail": {
                    "origin": "Windhoek",
                    "destination": "Oshakati",
                    "operator_name": "Northern Express",
                    "cover_image": "https://example.com/north.jpg",
                },
                "departs_at": departs.isoformat(),
                "arrives_at": arrives.isoformat(),
                "total_seats": 40,
                "price": "320.00",
                "amenities": ["Wi-Fi"],
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["route_detail"]["destination"], "Oshakati")
        self.assertEqual(BusTrip.objects.filter(route__destination="Oshakati").count(), 1)


class ProviderTransportBookingsApiTests(ProviderTransportApiTests, __import__("django").test.TestCase):
    def test_provider_rental_bookings(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.get("/api/transport/provider-rental-bookings/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["vehicle_title"], "Test Hilux")
        self.assertEqual(res.data[0]["guest_username"], "transport_guest")

    def test_provider_seat_bookings(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.get("/api/transport/provider-seat-bookings/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["route_label"], "Windhoek → Swakopmund")
        self.assertEqual(res.data[0]["seat"], 7)

    def test_confirm_rental_booking(self):
        booking = VehicleRentalBooking.objects.create(
            listing=self.vehicle,
            renter=self.traveler,
            start_date=(timezone.now() + timedelta(days=10)).date(),
            end_date=(timezone.now() + timedelta(days=12)).date(),
            total_price="1700.00",
            status=BookingStatus.PENDING,
        )
        self.client.force_authenticate(user=self.provider)
        res = self.client.post(f"/api/transport/provider-rental-bookings/{booking.id}/confirm/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], BookingStatus.CONFIRMED)
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.CONFIRMED)

    def test_cancel_rental_booking(self):
        booking = VehicleRentalBooking.objects.create(
            listing=self.vehicle,
            renter=self.traveler,
            start_date=(timezone.now() + timedelta(days=14)).date(),
            end_date=(timezone.now() + timedelta(days=16)).date(),
            total_price="1700.00",
            status=BookingStatus.PENDING,
        )
        self.client.force_authenticate(user=self.provider)
        res = self.client.post(f"/api/transport/provider-rental-bookings/{booking.id}/cancel/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], BookingStatus.CANCELLED)

    def test_check_in_rental_booking(self):
        booking = VehicleRentalBooking.objects.filter(listing=self.vehicle).first()
        self.assertEqual(booking.status, BookingStatus.CONFIRMED)
        self.client.force_authenticate(user=self.provider)
        res = self.client.post(f"/api/transport/provider-rental-bookings/{booking.id}/check_in/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], BookingStatus.CHECKED_IN)

    def test_confirm_seat_booking(self):
        seat = SeatReservation.objects.create(
            trip=self.trip,
            passenger=self.traveler,
            seat_number=9,
            status=BookingStatus.PENDING,
        )
        self.client.force_authenticate(user=self.provider)
        res = self.client.post(f"/api/transport/provider-seat-bookings/{seat.id}/confirm/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], BookingStatus.CONFIRMED)

    def test_other_provider_cannot_confirm_rental(self):
        other = User.objects.create_user(username="other_tp", email="o@t.local", password="pass12345")
        Profile.objects.filter(user=other).update(user_type=UserType.SERVICE_PROVIDER)
        other.profile.refresh_from_db()
        booking = VehicleRentalBooking.objects.create(
            listing=self.vehicle,
            renter=self.traveler,
            start_date=(timezone.now() + timedelta(days=20)).date(),
            end_date=(timezone.now() + timedelta(days=22)).date(),
            total_price="1700.00",
            status=BookingStatus.PENDING,
        )
        self.client.force_authenticate(user=other)
        res = self.client.post(f"/api/transport/provider-rental-bookings/{booking.id}/confirm/")
        self.assertEqual(res.status_code, 404)
