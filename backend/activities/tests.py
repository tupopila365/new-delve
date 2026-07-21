"""Public + provider activity listing API tests."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserType
from activities.models import ActivityCategory, ActivityListing, ActivityReview

User = get_user_model()


class ActivityCatalogTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.operator = User.objects.create_user(
            username="activity_ops",
            email="ops@test.local",
            password="pass12345",
        )
        self.operator.profile.user_type = UserType.SERVICE_PROVIDER
        self.operator.profile.email_verified = True
        self.operator.profile.save()

        self.traveler = User.objects.create_user(
            username="activity_guest",
            email="guest@test.local",
            password="pass12345",
        )
        self.traveler.profile.email_verified = True
        self.traveler.profile.save(update_fields=["email_verified"])

        self.active = ActivityListing.objects.create(
            owner=self.operator,
            title="Sunset dune drive",
            description="Evening scenic drive with photo stops.",
            category=ActivityCategory.DRIVES,
            country_code="NA",
            region="Erongo",
            city="Swakopmund",
            duration_hours=Decimal("3.0"),
            price_from=Decimal("850.00"),
            currency="NAD",
            price_note="per person",
            media_gallery=[
                {
                    "kind": "video",
                    "src": "https://cdn.example.com/dune-drive.mp4",
                    "caption": "Teaser",
                },
                {
                    "kind": "image",
                    "src": "https://cdn.example.com/dune.jpg",
                },
            ],
            cover_image="https://cdn.example.com/dune-drive.mp4",
            cover_kind="video",
            is_active=True,
        )
        ActivityListing.objects.create(
            owner=self.operator,
            title="Draft only",
            price_from=Decimal("10"),
            is_active=False,
        )

    def test_public_list_active_only_with_video_cover(self):
        res = self.client.get("/api/activities/listings/")
        self.assertEqual(res.status_code, 200)
        titles = {row["title"] for row in res.data}
        self.assertIn("Sunset dune drive", titles)
        self.assertNotIn("Draft only", titles)
        row = next(r for r in res.data if r["title"] == "Sunset dune drive")
        self.assertEqual(row["cover_kind"], "video")
        self.assertEqual(row["media_gallery"][0]["kind"], "video")

    def test_provider_can_create_with_gallery(self):
        self.client.force_authenticate(user=self.operator)
        res = self.client.post(
            "/api/activities/provider-listings/",
            {
                "title": "Kayak sunrise",
                "category": "water",
                "country_code": "ZA",
                "city": "Cape Town",
                "duration_hours": "2.0",
                "price_from": "450.00",
                "currency": "ZAR",
                "is_active": True,
                "media_gallery": [
                    {"kind": "image", "src": "https://cdn.example.com/kayak.jpg"},
                    {"kind": "video", "src": "https://cdn.example.com/kayak.mp4"},
                ],
                "cover_image": "https://cdn.example.com/kayak.jpg",
                "cover_kind": "image",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["title"], "Kayak sunrise")
        self.assertEqual(len(res.data["media_gallery"]), 2)
        self.assertTrue(ActivityListing.objects.filter(title="Kayak sunrise", is_active=True).exists())

    def test_detail_not_found_for_draft(self):
        draft = ActivityListing.objects.get(title="Draft only")
        res = self.client.get(f"/api/activities/listings/{draft.id}/")
        self.assertEqual(res.status_code, 404)

    def test_traveler_can_review_and_owner_cannot(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            f"/api/activities/listings/{self.active.id}/review/",
            {"rating": 5, "body": "Great drive"},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.active.refresh_from_db()
        self.assertEqual(self.active.rating_count, 1)
        self.assertEqual(float(self.active.rating_avg), 5.0)

        payload = self.client.get(f"/api/activities/listings/{self.active.id}/reviews/")
        self.assertEqual(payload.status_code, 200)
        self.assertTrue(payload.data["has_reviewed"])
        self.assertFalse(payload.data["can_review"])

        self.client.force_authenticate(user=self.operator)
        blocked = self.client.post(
            f"/api/activities/listings/{self.active.id}/review/",
            {"rating": 4, "body": "Own listing"},
            format="json",
        )
        self.assertEqual(blocked.status_code, 400)
        self.assertEqual(ActivityReview.objects.filter(listing=self.active).count(), 1)

    def test_save_toggle_and_saved_list(self):
        self.client.force_authenticate(user=self.traveler)
        save_url = f"/api/activities/listings/{self.active.id}/save/"
        res = self.client.post(save_url)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data["saved"])
        self.assertEqual(res.data["saves_count"], 1)

        detail = self.client.get(f"/api/activities/listings/{self.active.id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertTrue(detail.data["saved_by_me"])
        self.assertEqual(detail.data["saves_count"], 1)

        saved = self.client.get("/api/activities/listings/saved/")
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(len(saved.data), 1)
        self.assertEqual(saved.data[0]["id"], self.active.id)

        res2 = self.client.post(save_url)
        self.assertEqual(res2.status_code, 200)
        self.assertFalse(res2.data["saved"])
        self.assertEqual(res2.data["saves_count"], 0)
