"""Phase 4: public deals discovery."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import BusinessProfile, TravelOffer, UserType

User = get_user_model()


class DealsDiscoveryApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username="disc_owner", password="x")
        profile = self.owner.profile
        profile.user_type = UserType.SERVICE_PROVIDER
        profile.save(update_fields=["user_type"])
        self.biz = BusinessProfile.objects.create(
            owner=self.owner,
            business_name="Discovery Lodge",
            business_types=["accommodation"],
            city="Windhoek",
            region="Khomas",
            showcase_as_partner=True,
        )
        TravelOffer.objects.create(
            business=self.biz,
            title="SADC stay rate",
            offer_kind="eligibility",
            eligibility="sadc",
            price_label="50% off",
            categories=["stays"],
            how_to_claim="Show SADC passport.",
            is_active=True,
        )
        TravelOffer.objects.create(
            business=self.biz,
            title="Student food deal",
            offer_kind="discount",
            eligibility="student",
            price_label="Student −15%",
            categories=["food"],
            is_active=True,
        )

    def test_list_deals(self):
        res = self.client.get("/api/accounts/deals/")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.data["count"], 2)
        titles = {r["title"] for r in res.data["results"]}
        self.assertIn("SADC stay rate", titles)

    def test_filter_category(self):
        res = self.client.get("/api/accounts/deals/?category=stays")
        self.assertEqual(res.status_code, 200)
        titles = {r["title"] for r in res.data["results"]}
        self.assertIn("SADC stay rate", titles)
        self.assertNotIn("Student food deal", titles)

    def test_filter_eligibility(self):
        res = self.client.get("/api/accounts/deals/?eligibility=student")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(all(r["eligibility"] == "student" for r in res.data["results"]))

    def test_search_q(self):
        res = self.client.get("/api/accounts/deals/?q=SADC")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(any("SADC" in r["title"] for r in res.data["results"]))
