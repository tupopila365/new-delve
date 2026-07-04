"""Phase 2 — traveller guide booking cohesion."""

from datetime import time, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import UserType
from guides.models import GuideBooking, TourGuideProfile

User = get_user_model()


class TravellerGuideBookingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="guide_owner",
            email="guide_owner@test.local",
            password="pass12345",
        )
        self.owner.profile.user_type = UserType.SERVICE_PROVIDER
        self.owner.profile.save()
        self.traveler = User.objects.create_user(
            username="traveler",
            email="traveler@test.local",
            password="pass12345",
        )
        self.traveler.profile.email_verified = True
        self.traveler.profile.save()

        self.guide = TourGuideProfile.objects.create(
            user=self.owner,
            headline="Safari guide",
            regions=["Erongo"],
            tour_packages=[
                {
                    "id": "half-day",
                    "title": "Half-day dunes",
                    "hours": 4,
                    "price": "3600",
                }
            ],
            is_active=True,
        )

    def test_traveller_booking_includes_package_and_guide_username(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            "/api/guides/bookings/",
            {
                "guide": self.guide.pk,
                "date": (timezone.now() + timedelta(days=2)).date().isoformat(),
                "start_time": "09:00:00",
                "group_size": 2,
                "package_id": "half-day",
                "meeting_point": "Lodge lobby",
                "notes": "Need child seat",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["package_title"], "Half-day dunes")
        self.assertEqual(res.data["guide_username"], "guide_owner")
        self.assertEqual(res.data["guide_headline"], "Safari guide")
        self.assertEqual(res.data["duration_hours"], 4)
        self.assertEqual(res.data["meeting_point"], "Lodge lobby")
        self.assertEqual(res.data["status"], "pending")
        self.assertEqual(res.data["total_price"], "3600.00")

        listed = self.client.get("/api/guides/bookings/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)
        self.assertEqual(listed.data[0]["package_title"], "Half-day dunes")

    def test_traveller_can_mock_pay_pending(self):
        booking = GuideBooking.objects.create(
            guide=self.guide,
            client=self.traveler,
            date=(timezone.now() + timedelta(days=2)).date(),
            duration_hours=4,
            group_size=2,
            package_id="half-day",
            total_price="3600.00",
            status="pending",
        )
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(f"/api/guides/bookings/{booking.pk}/mock_pay/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "confirmed")
        self.assertTrue(res.data["mock_payment_ref"])
        booking.refresh_from_db()
        self.assertEqual(booking.status, "confirmed")

    def test_traveller_can_cancel_pending_and_confirmed(self):
        booking = GuideBooking.objects.create(
            guide=self.guide,
            client=self.traveler,
            date=(timezone.now() + timedelta(days=2)).date(),
            duration_hours=4,
            group_size=1,
            total_price="900.00",
            status="pending",
        )
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(f"/api/guides/bookings/{booking.pk}/cancel/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "cancelled")

        booking2 = GuideBooking.objects.create(
            guide=self.guide,
            client=self.traveler,
            date=(timezone.now() + timedelta(days=3)).date(),
            duration_hours=4,
            group_size=1,
            total_price="900.00",
            status="confirmed",
        )
        res = self.client.post(f"/api/guides/bookings/{booking2.pk}/cancel/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "cancelled")

    def test_traveller_cannot_cancel_completed(self):
        booking = GuideBooking.objects.create(
            guide=self.guide,
            client=self.traveler,
            date=(timezone.now() + timedelta(days=2)).date(),
            duration_hours=4,
            group_size=1,
            total_price="900.00",
            status="completed",
        )
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(f"/api/guides/bookings/{booking.pk}/cancel/", {}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_provider_confirm_visible_to_traveller(self):
        booking = GuideBooking.objects.create(
            guide=self.guide,
            client=self.traveler,
            date=(timezone.now() + timedelta(days=2)).date(),
            duration_hours=4,
            group_size=2,
            package_id="half-day",
            total_price="3600.00",
            status="pending",
        )
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f"/api/guides/provider-bookings/{booking.pk}/confirm/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "confirmed")

        self.client.force_authenticate(user=self.traveler)
        listed = self.client.get("/api/guides/bookings/")
        self.assertEqual(listed.data[0]["status"], "confirmed")


class PlatformGuideBookingAdminTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@test.local",
            password="pass12345",
            is_staff=True,
        )
        self.owner = User.objects.create_user(
            username="guide_owner",
            email="guide_owner@test.local",
            password="pass12345",
        )
        self.owner.profile.user_type = UserType.SERVICE_PROVIDER
        self.owner.profile.save()
        self.traveler = User.objects.create_user(
            username="traveler",
            email="traveler@test.local",
            password="pass12345",
        )
        self.guide = TourGuideProfile.objects.create(
            user=self.owner,
            headline="Safari guide",
            regions=["Erongo"],
            tour_packages=[{"id": "half-day", "title": "Half-day dunes", "hours": 4, "price": "3600"}],
            is_active=True,
        )
        self.booking = GuideBooking.objects.create(
            guide=self.guide,
            client=self.traveler,
            date=(timezone.now() + timedelta(days=2)).date(),
            start_time=time(9, 30),
            duration_hours=4,
            group_size=2,
            package_id="half-day",
            meeting_point="Lodge lobby",
            notes="Early start",
            total_price="3600.00",
            status="pending",
        )

    def test_admin_booking_detail_includes_guide_fields(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/api/accounts/admin/bookings/guide/{self.booking.pk}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["package_title"], "Half-day dunes")
        self.assertEqual(res.data["guide_headline"], "Safari guide")
        self.assertEqual(res.data["group_size"], 2)
        self.assertEqual(res.data["duration_hours"], 4)
        self.assertEqual(res.data["meeting_point"], "Lodge lobby")
        self.assertEqual(res.data["start_time"], "09:30")
        self.assertIn("Half-day dunes", res.data["listing_title"])
        self.assertEqual(res.data["notes"], "Early start")

    def test_admin_can_mark_guide_booking_completed(self):
        self.booking.status = "confirmed"
        self.booking.save(update_fields=["status"])
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f"/api/accounts/admin/bookings/guide/{self.booking.pk}/",
            {"status": "completed"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "completed")
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "completed")
