from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import BusinessProfile, UserType
from guides.models import GuideBooking, GuideSave, TourGuideProfile

User = get_user_model()


class GuideListingInspectorTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="guide_admin",
            email="guide_admin@test.local",
            password="pass12345",
            is_staff=True,
        )
        self.owner = User.objects.create_user(
            username="guide_inspect_owner",
            email="guide_inspect_owner@test.local",
            password="pass12345",
        )
        self.owner.profile.user_type = UserType.SERVICE_PROVIDER
        self.owner.profile.display_name = "Inspector Guide"
        self.owner.profile.save()
        BusinessProfile.objects.create(
            owner=self.owner,
            slug="inspect-guide-co",
            business_name="Inspect Guide Co",
            business_types=["guide"],
            verification_status="approved",
        )
        self.guide = TourGuideProfile.objects.create(
            user=self.owner,
            headline="Inspector Safari",
            regions=["Erongo"],
            languages=["English"],
            specialities=["Wildlife"],
            hourly_rate=Decimal("450.00"),
            licensed_guide=True,
            years_guiding=8,
            default_meeting_point="Lodge lobby",
            tour_packages=[
                {"id": "half-day", "title": "Half-day dunes", "hours": 4, "price": "3600"},
            ],
            guest_reviews=[{"name": "Sam", "place": "Windhoek", "rating": 5, "body": "Great tour"}],
            rating_avg=Decimal("4.90"),
            rating_count=3,
            is_active=True,
        )
        self.traveler = User.objects.create_user(
            username="guide_inspect_guest",
            email="guide_inspect_guest@test.local",
            password="pass12345",
        )
        GuideSave.objects.create(guide=self.guide, user=self.traveler)
        GuideBooking.objects.create(
            guide=self.guide,
            client=self.traveler,
            date=(timezone.now() + timedelta(days=2)).date(),
            duration_hours=4,
            group_size=2,
            package_id="half-day",
            total_price="3600.00",
            status="pending",
        )

    def test_platform_admin_can_inspect_guide_listing(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/api/accounts/admin/listings/guide/{self.guide.pk}/inspect/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["listing_type"], "guide")
        self.assertEqual(res.data["title"], "Inspector Safari")
        self.assertEqual(res.data["owner_username"], "guide_inspect_owner")
        self.assertEqual(res.data["owner_display_name"], "Inspector Guide")
        self.assertEqual(res.data["status"], "published")
        self.assertTrue(res.data["licensed_guide"])
        self.assertEqual(res.data["packages_count"], 1)
        self.assertEqual(res.data["packages"][0]["title"], "Half-day dunes")
        self.assertEqual(res.data["saves_count"], 1)
        self.assertEqual(res.data["bookings_by_status"]["pending"], 1)
        self.assertEqual(len(res.data["recent_bookings"]), 1)
        self.assertEqual(res.data["recent_bookings"][0]["package_title"], "Half-day dunes")
        self.assertEqual(res.data["business_name"], "Inspect Guide Co")
        self.assertEqual(res.data["business_verification_status"], "approved")
        self.assertEqual(res.data["public_url"], f"/guides/{self.guide.pk}")
        self.assertEqual(len(res.data["guest_reviews"]), 1)

    def test_inspector_not_found(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/accounts/admin/listings/guide/99999/inspect/")
        self.assertEqual(res.status_code, 404)

    def test_non_admin_cannot_inspect(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(f"/api/accounts/admin/listings/guide/{self.guide.pk}/inspect/")
        self.assertEqual(res.status_code, 403)
