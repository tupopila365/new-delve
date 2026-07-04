"""Phase 7 — guide profile promotion targets."""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import UserType
from guides.models import TourGuideProfile
from promotions.models import PromotionCampaign, PromotionPlacement, PromotionStatus, PromotionTargetType

User = get_user_model()


class GuidePromotionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.provider = User.objects.create_user(
            username="guide_promo_owner",
            email="guidepromo@test.local",
            password="pass12345",
        )
        self.provider.profile.user_type = UserType.SERVICE_PROVIDER
        self.provider.profile.save()

        self.guide = TourGuideProfile.objects.create(
            user=self.provider,
            headline="Promo Desert Guide",
            bio="Featured local expert.",
            regions=["Erongo"],
            languages=["English"],
            hourly_rate=Decimal("450.00"),
            licensed_guide=True,
            is_active=True,
        )
        now = timezone.now()
        PromotionCampaign.objects.create(
            placement=PromotionPlacement.HOMEPAGE_GUIDES,
            target_type=PromotionTargetType.GUIDE,
            target_id=str(self.guide.pk),
            target_label=self.guide.headline,
            starts_at=now - timedelta(hours=1),
            ends_at=now + timedelta(days=7),
            status=PromotionStatus.ACTIVE,
            priority=10,
        )
        PromotionCampaign.objects.create(
            placement=PromotionPlacement.CATEGORY_SPOTLIGHT,
            target_type=PromotionTargetType.GUIDE,
            target_id=str(self.guide.pk),
            target_label=self.guide.headline,
            starts_at=now - timedelta(hours=1),
            ends_at=now + timedelta(days=7),
            status=PromotionStatus.ACTIVE,
            priority=10,
        )

    def test_provider_listings_include_guide(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.get("/api/promotions/provider/listings/")
        self.assertEqual(res.status_code, 200)
        guide_rows = [row for row in res.data if row["target_type"] == PromotionTargetType.GUIDE]
        self.assertTrue(any(row["target_id"] == str(self.guide.pk) for row in guide_rows))

    def test_validate_guide_target(self):
        from promotions.services import validate_target_listing

        ok, label, err = validate_target_listing(PromotionTargetType.GUIDE, str(self.guide.pk))
        self.assertTrue(ok)
        self.assertEqual(label, "Promo Desert Guide")
        self.assertEqual(err, "")

    def test_featured_guides_includes_promoted_profile(self):
        res = self.client.get("/api/promotions/featured/guides/")
        self.assertEqual(res.status_code, 200)
        guide_ids = [row["id"] for row in res.data]
        self.assertIn(self.guide.pk, guide_ids)
        promoted = next(row for row in res.data if row.get("id") == self.guide.pk)
        self.assertTrue(promoted.get("is_featured_partner"))
        self.assertIsNotNone(promoted.get("promotion_id"))

    def test_category_spotlight_guides(self):
        res = self.client.get("/api/promotions/spotlight/guides/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        row = res.data[0]
        self.assertEqual(row["id"], self.guide.pk)
        self.assertTrue(row.get("is_featured_partner"))
        self.assertIsNotNone(row.get("promotion_id"))

    def test_homepage_guides_allows_guide_target_type(self):
        from promotions.services import allowed_target_types_for_placement

        types = allowed_target_types_for_placement(PromotionPlacement.HOMEPAGE_GUIDES)
        self.assertEqual(types, [PromotionTargetType.GUIDE])
