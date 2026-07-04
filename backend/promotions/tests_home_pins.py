"""Editorial homepage pins — admin API and featured rail merge."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import UserType
from food.models import CuisineType, FoodVenue
from promotions.models import HomePin, PromotionCampaign, PromotionPlacement, PromotionStatus, PromotionTargetType

User = get_user_model()


class HomePinTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="home_pin_admin",
            email="homepin@test.local",
            password="pass12345",
            is_staff=True,
        )
        self.provider = User.objects.create_user(
            username="home_pin_owner",
            email="homepinowner@test.local",
            password="pass12345",
        )
        profile = self.provider.profile
        profile.user_type = UserType.SERVICE_PROVIDER
        profile.save()

        self.venue_a = FoodVenue.objects.create(
            owner=self.provider,
            name="Pinned Grill",
            description="Editorial pin A.",
            cuisine=CuisineType.GRILL,
            region="Khomas",
            city="Windhoek",
            is_active=True,
        )
        self.venue_b = FoodVenue.objects.create(
            owner=self.provider,
            name="Pinned Cafe",
            description="Editorial pin B.",
            cuisine=CuisineType.CAFE,
            region="Khomas",
            city="Windhoek",
            is_active=True,
        )
        self.venue_promo = FoodVenue.objects.create(
            owner=self.provider,
            name="Paid Promo Spot",
            description="Paid partner.",
            cuisine=CuisineType.GRILL,
            region="Khomas",
            city="Windhoek",
            is_active=True,
        )
        now = timezone.now()
        PromotionCampaign.objects.create(
            placement=PromotionPlacement.HOMEPAGE_FOOD,
            target_type=PromotionTargetType.FOOD,
            target_id=str(self.venue_promo.pk),
            target_label=self.venue_promo.name,
            starts_at=now - timedelta(hours=1),
            ends_at=now + timedelta(days=7),
            status=PromotionStatus.ACTIVE,
            priority=10,
        )

    def test_admin_create_list_reorder_and_delete(self):
        self.client.force_authenticate(user=self.admin)
        create = self.client.post(
            "/api/accounts/admin/home-pins/",
            {
                "placement": PromotionPlacement.HOMEPAGE_FOOD,
                "target_type": PromotionTargetType.FOOD,
                "target_id": str(self.venue_a.pk),
                "partner_label": "Editor's pick",
            },
            format="json",
        )
        self.assertEqual(create.status_code, 201)
        pin_a = create.data
        self.assertEqual(pin_a["target_label"], "Pinned Grill")
        self.assertTrue(pin_a["is_active"])

        create_b = self.client.post(
            "/api/accounts/admin/home-pins/",
            {
                "placement": PromotionPlacement.HOMEPAGE_FOOD,
                "target_type": PromotionTargetType.FOOD,
                "target_id": str(self.venue_b.pk),
            },
            format="json",
        )
        self.assertEqual(create_b.status_code, 201)
        pin_b = create_b.data

        blocked = self.client.post(
            "/api/accounts/admin/home-pins/",
            {
                "placement": PromotionPlacement.HOMEPAGE_FOOD,
                "target_type": PromotionTargetType.FOOD,
                "target_id": str(self.venue_promo.pk),
            },
            format="json",
        )
        self.assertEqual(blocked.status_code, 400)

        inactive_ok = self.client.post(
            "/api/accounts/admin/home-pins/",
            {
                "placement": PromotionPlacement.HOMEPAGE_FOOD,
                "target_type": PromotionTargetType.FOOD,
                "target_id": str(self.venue_promo.pk),
                "is_active": False,
            },
            format="json",
        )
        self.assertEqual(inactive_ok.status_code, 201)

        listed = self.client.get(
            f"/api/accounts/admin/home-pins/?placement={PromotionPlacement.HOMEPAGE_FOOD}"
        )
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 3)

        reorder = self.client.post(
            "/api/accounts/admin/home-pins/reorder/",
            {
                "placement": PromotionPlacement.HOMEPAGE_FOOD,
                "ordered_ids": [pin_b["id"], pin_a["id"]],
            },
            format="json",
        )
        self.assertEqual(reorder.status_code, 200)
        active_rows = [r for r in reorder.data if r["is_active"]]
        self.assertEqual([r["id"] for r in active_rows[:2]], [pin_b["id"], pin_a["id"]])

        delete = self.client.delete(f"/api/accounts/admin/home-pins/{pin_a['id']}/")
        self.assertEqual(delete.status_code, 204)
        self.assertFalse(HomePin.objects.filter(pk=pin_a["id"]).exists())

    def test_non_admin_forbidden(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.get("/api/accounts/admin/home-pins/")
        self.assertEqual(res.status_code, 403)

    def test_featured_food_puts_editorial_pins_first(self):
        HomePin.objects.create(
            placement=PromotionPlacement.HOMEPAGE_FOOD,
            target_type=PromotionTargetType.FOOD,
            target_id=str(self.venue_a.pk),
            target_label=self.venue_a.name,
            partner_label="Editor's pick",
            sort_order=0,
            is_active=True,
            created_by=self.admin,
        )
        HomePin.objects.create(
            placement=PromotionPlacement.HOMEPAGE_FOOD,
            target_type=PromotionTargetType.FOOD,
            target_id=str(self.venue_b.pk),
            target_label=self.venue_b.name,
            partner_label="Staff pick",
            sort_order=1,
            is_active=True,
            created_by=self.admin,
        )

        res = self.client.get("/api/promotions/featured/food/")
        self.assertEqual(res.status_code, 200)
        ids = [row["id"] for row in res.data]
        self.assertEqual(ids[0], self.venue_a.pk)
        self.assertEqual(ids[1], self.venue_b.pk)
        self.assertIn(self.venue_promo.pk, ids)
        self.assertGreater(ids.index(self.venue_promo.pk), 1)

        pin_row = res.data[0]
        self.assertTrue(pin_row.get("is_editorial_pin"))
        self.assertTrue(pin_row.get("is_featured_partner"))
        self.assertEqual(pin_row.get("partner_label"), "Editor's pick")
        self.assertIsNone(pin_row.get("promotion_id"))

        promo_row = next(row for row in res.data if row["id"] == self.venue_promo.pk)
        self.assertFalse(promo_row.get("is_editorial_pin"))
        self.assertTrue(promo_row.get("is_featured_partner"))
        self.assertIsNotNone(promo_row.get("promotion_id"))

    def test_inactive_pin_excluded_from_featured(self):
        HomePin.objects.create(
            placement=PromotionPlacement.HOMEPAGE_FOOD,
            target_type=PromotionTargetType.FOOD,
            target_id=str(self.venue_a.pk),
            target_label=self.venue_a.name,
            is_active=False,
            created_by=self.admin,
        )
        res = self.client.get("/api/promotions/featured/food/")
        self.assertEqual(res.status_code, 200)
        pin_rows = [row for row in res.data if row.get("is_editorial_pin")]
        self.assertEqual(pin_rows, [])
        self.assertIn(self.venue_promo.pk, [row["id"] for row in res.data])
