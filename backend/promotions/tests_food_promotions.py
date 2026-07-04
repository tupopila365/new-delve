"""Phase 9 — food venue promotion targets."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import UserType
from food.models import CuisineType, FoodVenue
from promotions.models import PromotionCampaign, PromotionPlacement, PromotionStatus, PromotionTargetType

User = get_user_model()


class FoodPromotionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.provider = User.objects.create_user(
            username="food_promo_owner",
            email="foodpromo@test.local",
            password="pass12345",
        )
        Profile = self.provider.profile
        Profile.user_type = UserType.SERVICE_PROVIDER
        Profile.save()

        self.venue = FoodVenue.objects.create(
            owner=self.provider,
            name="Promo Grill",
            description="Featured local grill.",
            cuisine=CuisineType.GRILL,
            region="Khomas",
            city="Windhoek",
            is_active=True,
        )
        now = timezone.now()
        PromotionCampaign.objects.create(
            placement=PromotionPlacement.HOMEPAGE_FOOD,
            target_type=PromotionTargetType.FOOD,
            target_id=str(self.venue.pk),
            target_label=self.venue.name,
            starts_at=now - timedelta(hours=1),
            ends_at=now + timedelta(days=7),
            status=PromotionStatus.ACTIVE,
            priority=10,
        )
        PromotionCampaign.objects.create(
            placement=PromotionPlacement.CATEGORY_SPOTLIGHT,
            target_type=PromotionTargetType.FOOD,
            target_id=str(self.venue.pk),
            target_label=self.venue.name,
            starts_at=now - timedelta(hours=1),
            ends_at=now + timedelta(days=7),
            status=PromotionStatus.ACTIVE,
            priority=10,
        )

    def test_provider_listings_include_food(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.get("/api/promotions/provider/listings/")
        self.assertEqual(res.status_code, 200)
        food_rows = [row for row in res.data if row["target_type"] == PromotionTargetType.FOOD]
        self.assertTrue(any(row["target_id"] == str(self.venue.pk) for row in food_rows))

    def test_validate_food_target(self):
        from promotions.services import validate_target_listing

        ok, label, err = validate_target_listing(PromotionTargetType.FOOD, str(self.venue.pk))
        self.assertTrue(ok)
        self.assertEqual(label, "Promo Grill")
        self.assertEqual(err, "")

    def test_featured_food_includes_promoted_venue(self):
        res = self.client.get("/api/promotions/featured/food/")
        self.assertEqual(res.status_code, 200)
        venue_ids = [row["id"] for row in res.data]
        self.assertIn(self.venue.pk, venue_ids)
        promoted = next(row for row in res.data if row.get("id") == self.venue.pk)
        self.assertTrue(promoted.get("is_featured_partner"))
        self.assertIsNotNone(promoted.get("promotion_id"))

    def test_category_spotlight_food(self):
        res = self.client.get("/api/promotions/spotlight/food/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        row = res.data[0]
        self.assertEqual(row["id"], self.venue.pk)
        self.assertTrue(row.get("is_featured_partner"))
        self.assertIsNotNone(row.get("promotion_id"))

    def test_homepage_food_allows_food_target_type(self):
        from promotions.services import allowed_target_types_for_placement

        types = allowed_target_types_for_placement(PromotionPlacement.HOMEPAGE_FOOD)
        self.assertEqual(types, [PromotionTargetType.FOOD])
