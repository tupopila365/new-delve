from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from guides.models import TourGuideProfile

User = get_user_model()


class GuideListFindabilityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.u1 = User.objects.create_user(
            username="guide_whk",
            email="guide_whk@test.local",
            password="pass12345",
        )
        self.u2 = User.objects.create_user(
            username="guide_swk",
            email="guide_swk@test.local",
            password="pass12345",
        )
        self.windhoek = TourGuideProfile.objects.create(
            user=self.u1,
            headline="Windhoek culture walks",
            bio="City heritage and food markets",
            regions=["Windhoek", "Khomas"],
            languages=["English", "Afrikaans"],
            specialities=["Culture", "Food"],
            licensed_guide=True,
            hourly_rate=Decimal("250.00"),
            rating_avg=Decimal("4.90"),
            is_active=True,
        )
        self.swakop = TourGuideProfile.objects.create(
            user=self.u2,
            headline="Coastal wildlife tours",
            bio="Seals and desert dunes",
            regions=["Swakopmund", "Erongo"],
            languages=["German", "English"],
            specialities=["Wildlife", "Photography"],
            licensed_guide=False,
            hourly_rate=Decimal("450.00"),
            rating_avg=Decimal("4.20"),
            is_active=True,
        )

    def test_region_filter(self):
        res = self.client.get("/api/guides/profiles/", {"region": "Windhoek"})
        self.assertEqual(res.status_code, 200)
        ids = {row["id"] for row in res.data}
        self.assertIn(self.windhoek.id, ids)
        self.assertNotIn(self.swakop.id, ids)

    def test_language_filter(self):
        res = self.client.get("/api/guides/profiles/", {"language": "German"})
        self.assertEqual(res.status_code, 200)
        ids = {row["id"] for row in res.data}
        self.assertIn(self.swakop.id, ids)
        self.assertNotIn(self.windhoek.id, ids)

    def test_licensed_filter(self):
        res = self.client.get("/api/guides/profiles/", {"licensed": "1"})
        self.assertEqual(res.status_code, 200)
        ids = {row["id"] for row in res.data}
        self.assertIn(self.windhoek.id, ids)
        self.assertNotIn(self.swakop.id, ids)

    def test_search_includes_specialities(self):
        res = self.client.get("/api/guides/profiles/", {"search": "Photography"})
        self.assertEqual(res.status_code, 200)
        ids = {row["id"] for row in res.data}
        self.assertIn(self.swakop.id, ids)

    def test_ordering_hourly_rate(self):
        res = self.client.get("/api/guides/profiles/", {"ordering": "hourly_rate"})
        self.assertEqual(res.status_code, 200)
        ids = [row["id"] for row in res.data]
        self.assertLess(ids.index(self.windhoek.id), ids.index(self.swakop.id))
