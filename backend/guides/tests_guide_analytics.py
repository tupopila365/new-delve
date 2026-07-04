from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import UserType
from guides.models import GuideBooking, GuideSave, TourGuideProfile

User = get_user_model()


class GuideProviderAnalyticsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="guide_analytics_host",
            email="guide_analytics_host@test.local",
            password="pass12345",
        )
        self.owner.profile.user_type = UserType.SERVICE_PROVIDER
        self.owner.profile.save()
        self.traveler = User.objects.create_user(
            username="guide_analytics_guest",
            email="guide_analytics_guest@test.local",
            password="pass12345",
        )
        self.guide = TourGuideProfile.objects.create(
            user=self.owner,
            headline="Analytics Safari",
            regions=["Erongo"],
            rating_avg=Decimal("4.80"),
            rating_count=5,
            tour_packages=[{"id": "half-day", "title": "Half-day", "hours": 4, "price": "3600"}],
            is_active=True,
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
            status="confirmed",
        )
        GuideBooking.objects.create(
            guide=self.guide,
            client=self.traveler,
            date=(timezone.now() + timedelta(days=5)).date(),
            duration_hours=4,
            group_size=1,
            total_price="900.00",
            status="pending",
        )
        GuideBooking.objects.create(
            guide=self.guide,
            client=self.traveler,
            date=(timezone.now() + timedelta(days=1)).date(),
            duration_hours=4,
            group_size=1,
            total_price="900.00",
            status="cancelled",
        )

    def test_provider_analytics_summary(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/guides/provider-analytics/?days=30")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total_saves"], 1)
        self.assertEqual(res.data["total_bookings"], 2)
        self.assertEqual(res.data["confirmed_bookings"], 1)
        self.assertEqual(res.data["pending_requests"], 1)
        self.assertEqual(res.data["revenue"], "3600.00")
        self.assertEqual(res.data["rating_avg"], 4.8)
        self.assertEqual(res.data["rating_count"], 5)
        self.assertEqual(len(res.data["profiles"]), 1)
        self.assertEqual(res.data["profiles"][0]["headline"], "Analytics Safari")
        self.assertEqual(res.data["profiles"][0]["saves_count"], 1)
        self.assertEqual(res.data["profiles"][0]["bookings"], 2)

    def test_traveler_cannot_access_analytics(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.get("/api/guides/provider-analytics/")
        self.assertEqual(res.status_code, 403)
