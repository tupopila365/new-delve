"""Phase 1: compact travel-offer deals on listings."""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.listing_deals import (
    build_deals_by_owner,
    compact_deal_payload,
    deal_badge_kind,
    deal_badge_label,
    offer_matches_category,
)
from accounts.models import BusinessProfile, TravelOffer, UserType
from food.models import FoodVenue

User = get_user_model()


class ListingDealsHelpersTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="deal_owner", password="x")
        self.biz = BusinessProfile.objects.create(
            owner=self.owner,
            business_name="Deal Lodge",
            business_types=["accommodation", "food_drink"],
        )
        self.offer = TravelOffer.objects.create(
            business=self.biz,
            title="SADC resident rate",
            offer_kind="eligibility",
            eligibility="sadc",
            price_label="50% off",
            categories=["stays", "food"],
            how_to_claim="Show your SADC passport at check-in.",
            proof_required="Valid SADC passport",
            is_active=True,
        )

    def test_badge_and_match(self):
        self.assertEqual(deal_badge_label(self.offer), "50% off")
        self.assertEqual(deal_badge_kind(self.offer), "eligibility")
        self.assertTrue(offer_matches_category(self.offer, "food"))
        self.assertTrue(offer_matches_category(self.offer, "stays"))
        self.assertFalse(offer_matches_category(self.offer, "shop"))

    def test_empty_categories_match_all(self):
        self.offer.categories = []
        self.offer.save(update_fields=["categories"])
        self.assertTrue(offer_matches_category(self.offer, "transport"))

    def test_build_deals_by_owner(self):
        by_owner = build_deals_by_owner([self.owner.id], "food")
        deals = by_owner.get(self.owner.id, [])
        self.assertEqual(len(deals), 1)
        self.assertEqual(deals[0]["badge"], "50% off")
        self.assertIn("Show your SADC", deals[0]["how_to_claim"])

    def test_expired_offer_excluded(self):
        self.offer.ends_on = date.today() - timedelta(days=1)
        self.offer.save(update_fields=["ends_on"])
        by_owner = build_deals_by_owner([self.owner.id], "food")
        self.assertEqual(by_owner.get(self.owner.id, []), [])

    def test_compact_payload_shape(self):
        payload = compact_deal_payload(self.offer)
        self.assertEqual(payload["business_id"], self.biz.id)
        self.assertEqual(payload["eligibility_display"], "SADC residents")


class FoodVenueDealsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username="food_deal_owner", password="x")
        profile = self.owner.profile
        profile.user_type = UserType.SERVICE_PROVIDER
        profile.save(update_fields=["user_type"])
        self.biz = BusinessProfile.objects.create(
            owner=self.owner,
            business_name="Deal Cafe",
            business_types=["food_drink"],
        )
        TravelOffer.objects.create(
            business=self.biz,
            title="Student lunch",
            offer_kind="discount",
            eligibility="student",
            price_label="Student −15%",
            categories=["food"],
            how_to_claim="Show student card when ordering.",
            is_active=True,
        )
        self.venue = FoodVenue.objects.create(
            owner=self.owner,
            name="Deal Cafe Spot",
            cuisine="cafe",
            region="Khomas",
            price_level=2,
            is_active=True,
        )

    def test_list_includes_deals(self):
        res = self.client.get("/api/food/venues/")
        self.assertEqual(res.status_code, 200)
        rows = res.data if isinstance(res.data, list) else res.data.get("results", res.data)
        venue = next(r for r in rows if r["id"] == self.venue.id)
        self.assertTrue(venue.get("deals"))
        self.assertEqual(venue["deals"][0]["badge"], "Student −15%")
        self.assertIn("student card", venue["deals"][0]["how_to_claim"].lower())
