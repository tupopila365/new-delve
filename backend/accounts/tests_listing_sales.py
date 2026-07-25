"""Phase 2: listing-level sales merge ahead of business travel offers."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.listing_deals import deals_for_listing
from accounts.listing_sales import compact_listing_sale_payload, listing_sale_badge
from accounts.models import BusinessProfile, ListingSale, TravelOffer, UserType
from food.models import FoodVenue

User = get_user_model()


class ListingSaleHelpersTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="sale_owner", password="x")
        self.sale = ListingSale.objects.create(
            owner=self.owner,
            vertical="food",
            listing_id=42,
            title="Lunch special",
            sale_price=Decimal("80.00"),
            compare_at_price=Decimal("100.00"),
            how_to_claim="Order before 14:00.",
            is_active=True,
        )

    def test_badge_from_prices(self):
        self.assertEqual(listing_sale_badge(self.sale), "20% off")

    def test_compact_payload(self):
        payload = compact_listing_sale_payload(self.sale)
        self.assertEqual(payload["source"], "listing_sale")
        self.assertEqual(payload["sale_id"], self.sale.pk)
        self.assertEqual(payload["badge_kind"], "sale")
        self.assertEqual(payload["listing_href"], "/food/42")
        self.assertIn("Order before", payload["how_to_claim"])


class ListingSaleMergeTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="merge_owner", password="x")
        self.biz = BusinessProfile.objects.create(
            owner=self.owner,
            business_name="Merge Cafe",
            business_types=["food_drink"],
        )
        TravelOffer.objects.create(
            business=self.biz,
            title="Student lunch",
            offer_kind="discount",
            eligibility="student",
            price_label="Student −15%",
            categories=["food"],
            how_to_claim="Show student card.",
            is_active=True,
        )
        self.venue = FoodVenue.objects.create(
            owner=self.owner,
            name="Merge Spot",
            cuisine="cafe",
            region="Khomas",
            price_level=2,
            is_active=True,
        )
        ListingSale.objects.create(
            owner=self.owner,
            vertical="food",
            listing_id=self.venue.id,
            title="Venue sale",
            badge="Sale",
            sale_price=Decimal("50.00"),
            compare_at_price=Decimal("70.00"),
            is_active=True,
        )

    def test_listing_sale_precedes_travel_offer(self):
        deals = deals_for_listing(self.venue, {}, "food")
        self.assertGreaterEqual(len(deals), 2)
        self.assertEqual(deals[0]["source"], "listing_sale")
        self.assertEqual(deals[0]["badge"], "Sale")
        self.assertEqual(deals[1]["source"], "travel_offer")


class ListingSaleApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username="api_sale_owner", password="x")
        profile = self.owner.profile
        profile.user_type = UserType.SERVICE_PROVIDER
        profile.save(update_fields=["user_type"])
        self.venue = FoodVenue.objects.create(
            owner=self.owner,
            name="API Sale Cafe",
            cuisine="cafe",
            region="Khomas",
            price_level=2,
            is_active=True,
        )
        self.client.force_authenticate(user=self.owner)

    def test_upsert_and_clear(self):
        url = f"/api/accounts/me/listing-sales/food/{self.venue.id}/"
        res = self.client.put(
            url,
            {
                "title": "Happy hour",
                "sale_price": "40.00",
                "compare_at_price": "55.00",
                "how_to_claim": "Mention happy hour.",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["title"], "Happy hour")
        self.assertEqual(ListingSale.objects.filter(vertical="food", listing_id=self.venue.id).count(), 1)

        get_res = self.client.get(url)
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.data["title"], "Happy hour")

        list_res = self.client.get("/api/food/venues/")
        self.assertEqual(list_res.status_code, 200)
        rows = list_res.data if isinstance(list_res.data, list) else list_res.data.get("results", list_res.data)
        venue = next(r for r in rows if r["id"] == self.venue.id)
        self.assertEqual(venue["deals"][0]["source"], "listing_sale")
        self.assertEqual(venue["deals"][0]["badge"], "27% off")

        del_res = self.client.delete(url)
        self.assertEqual(del_res.status_code, 204)
        self.assertFalse(ListingSale.objects.filter(vertical="food", listing_id=self.venue.id).exists())
