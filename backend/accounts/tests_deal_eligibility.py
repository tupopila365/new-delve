"""Phase 3: richer eligibility + soft profile matching."""

from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.deal_eligibility import (
    age_range_label,
    assess_offer_qualification,
    enriched_eligibility_display,
    party_size_label,
)
from accounts.listing_deals import compact_deal_payload
from accounts.models import BusinessProfile, TravelOffer

User = get_user_model()


class DealEligibilityHelpersTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="elig_owner", email="elig_owner@test.local", password="x"
        )
        self.biz = BusinessProfile.objects.create(
            owner=self.owner,
            business_name="Elig Lodge",
            business_types=["accommodation"],
        )
        self.offer = TravelOffer.objects.create(
            business=self.biz,
            title="Under 25 weekend",
            offer_kind="discount",
            eligibility="everyone",
            price_label="−15%",
            max_age=24,
            min_party_size=2,
            max_party_size=4,
            how_to_claim="Book online and mention under-25.",
            is_active=True,
        )

    def test_labels(self):
        self.assertEqual(age_range_label(None, 24), "Under 25")
        self.assertEqual(age_range_label(18, 24), "Ages 18–24")
        self.assertEqual(party_size_label(2, 4), "Groups of 2–4")

    def test_enriched_display(self):
        text = enriched_eligibility_display(self.offer)
        self.assertIn("Under 25", text)
        self.assertIn("Groups of 2–4", text)

    def test_soft_match_age_yes(self):
        traveller = User.objects.create_user(
            username="young", email="young@test.local", password="x"
        )
        traveller.profile.birth_year = date.today().year - 22
        traveller.profile.save(update_fields=["birth_year"])
        match = assess_offer_qualification(self.offer, traveller.profile)
        self.assertTrue(match["may_qualify"])

    def test_soft_match_age_no(self):
        traveller = User.objects.create_user(
            username="older", email="older@test.local", password="x"
        )
        traveller.profile.birth_year = date.today().year - 40
        traveller.profile.save(update_fields=["birth_year"])
        match = assess_offer_qualification(self.offer, traveller.profile)
        self.assertFalse(match["may_qualify"])

    def test_sadc_country(self):
        offer = TravelOffer.objects.create(
            business=self.biz,
            title="SADC rate",
            offer_kind="eligibility",
            eligibility="sadc",
            is_active=True,
        )
        traveller = User.objects.create_user(
            username="sadc_user", email="sadc_user@test.local", password="x"
        )
        traveller.profile.country_code = "NA"
        traveller.profile.save(update_fields=["country_code"])
        match = assess_offer_qualification(offer, traveller.profile)
        self.assertTrue(match["may_qualify"])
        self.assertIn("SADC", match["qualify_hint"])

        traveller.profile.country_code = "US"
        traveller.profile.save(update_fields=["country_code"])
        match = assess_offer_qualification(offer, traveller.profile)
        self.assertFalse(match["may_qualify"])

    def test_compact_payload_includes_phase3(self):
        traveller = User.objects.create_user(
            username="viewer", email="viewer@test.local", password="x"
        )
        traveller.profile.birth_year = date.today().year - 20
        traveller.profile.save(update_fields=["birth_year"])
        payload = compact_deal_payload(self.offer, viewer_profile=traveller.profile)
        self.assertEqual(payload["max_age"], 24)
        self.assertEqual(payload["min_party_size"], 2)
        self.assertTrue(payload["may_qualify"])
        self.assertIn("Under 25", payload["eligibility_display"])
