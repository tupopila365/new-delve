"""Phase 1 — booking marketplace hold → release across stays, guides, transport."""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accommodation.models import AccommodationBooking, AccommodationListing, BookingStatus
from accounts.marketplace_payout import PayoutStatus
from accounts.models import UserType
from guides.models import GuideBooking, TourGuideProfile
from transport.models import BusOperator, BusRoute, BusTrip, SeatReservation, VehicleRentalBooking, VehicleRentalListing

User = get_user_model()


@override_settings(BOOKING_PLATFORM_FEE_PERCENT="10")
class BookingMarketplacePayoutTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.provider = User.objects.create_user(
            username="host_prov",
            email="host_prov@test.local",
            password="pass12345",
        )
        self.provider.profile.user_type = UserType.SERVICE_PROVIDER
        self.provider.profile.email_verified = True
        self.provider.profile.save()

        self.guest = User.objects.create_user(
            username="guest_trav",
            email="guest_trav@test.local",
            password="pass12345",
        )
        self.guest.profile.email_verified = True
        self.guest.profile.save()

        self.listing = AccommodationListing.objects.create(
            owner=self.provider,
            title="Desert Lodge",
            region="Erongo",
            city="Swakopmund",
            price_per_night=Decimal("1000.00"),
            is_active=True,
        )

    def test_stay_pay_hold_checkout_releases(self):
        today = timezone.now().date()
        booking = AccommodationBooking.objects.create(
            listing=self.listing,
            guest=self.guest,
            check_in=today + timedelta(days=2),
            check_out=today + timedelta(days=4),
            guests=2,
            total_price=Decimal("2000.00"),
            status=BookingStatus.CONFIRMED,
        )

        self.client.force_authenticate(user=self.guest)
        pay = self.client.post(f"/api/accommodation/bookings/{booking.pk}/mock_pay/")
        self.assertEqual(pay.status_code, 200, pay.data)
        booking.refresh_from_db()
        self.assertEqual(booking.payout_status, PayoutStatus.HELD)
        self.assertEqual(booking.platform_fee, Decimal("200.00"))
        self.assertEqual(booking.seller_payout, Decimal("1800.00"))
        self.assertTrue(booking.mock_payment_ref)

        self.client.force_authenticate(user=self.provider)
        self.client.post(f"/api/accommodation/provider-bookings/{booking.pk}/check_in/")
        out = self.client.post(f"/api/accommodation/provider-bookings/{booking.pk}/check_out/")
        self.assertEqual(out.status_code, 200, out.data)
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.CHECKED_OUT)
        self.assertEqual(booking.payout_status, PayoutStatus.RELEASED)
        self.assertIsNotNone(booking.payout_released_at)

    def test_guide_pay_hold_complete_releases(self):
        guide = TourGuideProfile.objects.create(
            user=self.provider,
            headline="Safari guide",
            regions=["Erongo"],
            tour_packages=[{"id": "half", "title": "Half day", "hours": 4, "price": "3600"}],
            is_active=True,
        )
        booking = GuideBooking.objects.create(
            guide=guide,
            client=self.guest,
            date=timezone.now().date() + timedelta(days=3),
            total_price=Decimal("3600.00"),
            status="pending",
        )

        self.client.force_authenticate(user=self.guest)
        pay = self.client.post(f"/api/guides/bookings/{booking.pk}/mock_pay/")
        self.assertEqual(pay.status_code, 200, pay.data)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "confirmed")
        self.assertEqual(booking.payout_status, PayoutStatus.HELD)
        self.assertEqual(booking.platform_fee, Decimal("360.00"))
        self.assertEqual(booking.seller_payout, Decimal("3240.00"))

        self.client.force_authenticate(user=self.provider)
        done = self.client.post(f"/api/guides/provider-bookings/{booking.pk}/complete/")
        self.assertEqual(done.status_code, 200, done.data)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "completed")
        self.assertEqual(booking.payout_status, PayoutStatus.RELEASED)

    def test_vehicle_pay_hold_checkout_releases(self):
        vehicle = VehicleRentalListing.objects.create(
            owner=self.provider,
            title="4x4",
            make="Toyota",
            model="Hilux",
            year=2020,
            price_per_day=Decimal("800.00"),
            region="Khomas",
            city="Windhoek",
            is_active=True,
        )
        today = timezone.now().date()
        booking = VehicleRentalBooking.objects.create(
            listing=vehicle,
            renter=self.guest,
            start_date=today + timedelta(days=1),
            end_date=today + timedelta(days=3),
            total_price=Decimal("2400.00"),
            status=BookingStatus.CONFIRMED,
        )

        self.client.force_authenticate(user=self.guest)
        pay = self.client.post(f"/api/transport/vehicle-bookings/{booking.pk}/mock_pay/")
        self.assertEqual(pay.status_code, 200, pay.data)
        booking.refresh_from_db()
        self.assertEqual(booking.payout_status, PayoutStatus.HELD)
        self.assertEqual(booking.platform_fee, Decimal("240.00"))

        self.client.force_authenticate(user=self.provider)
        self.client.post(f"/api/transport/provider-rental-bookings/{booking.pk}/check_in/")
        out = self.client.post(f"/api/transport/provider-rental-bookings/{booking.pk}/check_out/")
        self.assertEqual(out.status_code, 200, out.data)
        booking.refresh_from_db()
        self.assertEqual(booking.payout_status, PayoutStatus.RELEASED)

    def test_bus_seat_pay_hold_checkout_releases(self):
        operator = BusOperator.objects.create(owner=self.provider, name="Coastal Coaches")
        route = BusRoute.objects.create(
            operator=operator,
            origin="Windhoek",
            destination="Swakopmund",
        )
        trip = BusTrip.objects.create(
            route=route,
            departs_at=timezone.now() + timedelta(days=2),
            arrives_at=timezone.now() + timedelta(days=2, hours=5),
            price=Decimal("200.00"),
            total_seats=40,
            is_active=True,
        )
        seat = SeatReservation.objects.create(
            trip=trip,
            passenger=self.guest,
            seat_number=5,
            status=BookingStatus.CONFIRMED,
            total_price=Decimal("200.00"),
        )

        self.client.force_authenticate(user=self.guest)
        pay = self.client.post(f"/api/transport/bus/reservations/{seat.pk}/mock_pay/")
        self.assertEqual(pay.status_code, 200, pay.data)
        seat.refresh_from_db()
        self.assertEqual(seat.payout_status, PayoutStatus.HELD)
        self.assertEqual(seat.platform_fee, Decimal("20.00"))
        self.assertEqual(seat.seller_payout, Decimal("180.00"))

        self.client.force_authenticate(user=self.provider)
        self.client.post(f"/api/transport/provider-seat-bookings/{seat.pk}/check_in/")
        out = self.client.post(f"/api/transport/provider-seat-bookings/{seat.pk}/check_out/")
        self.assertEqual(out.status_code, 200, out.data)
        seat.refresh_from_db()
        self.assertEqual(seat.payout_status, PayoutStatus.RELEASED)
