from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from guides.models import GuideSave, TourGuideProfile

User = get_user_model()


class GuideSaveTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="guide_owner",
            email="guide_owner@test.local",
            password="pass12345",
        )
        self.traveler = User.objects.create_user(
            username="guide_traveler",
            email="guide_traveler@test.local",
            password="pass12345",
        )
        self.guide = TourGuideProfile.objects.create(
            user=self.owner,
            headline="Windhoek walks",
            regions=["Khomas"],
            is_active=True,
        )

    def test_save_toggle_and_saved_list(self):
        self.client.force_authenticate(user=self.traveler)

        save_url = f"/api/guides/profiles/{self.guide.pk}/save/"
        res = self.client.post(save_url)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["saved"])
        self.assertEqual(res.data["saves_count"], 1)
        self.assertTrue(GuideSave.objects.filter(guide=self.guide, user=self.traveler).exists())

        detail = self.client.get(f"/api/guides/profiles/{self.guide.pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertTrue(detail.data["saved_by_me"])
        self.assertEqual(detail.data["saves_count"], 1)

        saved_list = self.client.get("/api/guides/profiles/saved/")
        self.assertEqual(saved_list.status_code, 200)
        self.assertEqual(len(saved_list.data), 1)
        self.assertEqual(saved_list.data[0]["id"], self.guide.pk)

        unsave = self.client.post(save_url)
        self.assertEqual(unsave.status_code, 200)
        self.assertFalse(unsave.data["saved"])
        self.assertEqual(unsave.data["saves_count"], 0)

        saved_empty = self.client.get("/api/guides/profiles/saved/")
        self.assertEqual(len(saved_empty.data), 0)

    def test_list_includes_saved_by_me_when_authenticated(self):
        GuideSave.objects.create(guide=self.guide, user=self.traveler)
        self.client.force_authenticate(user=self.traveler)
        res = self.client.get("/api/guides/profiles/")
        self.assertEqual(res.status_code, 200)
        row = next(r for r in res.data if r["id"] == self.guide.pk)
        self.assertTrue(row["saved_by_me"])
        self.assertEqual(row["saves_count"], 1)

    def test_save_requires_auth(self):
        res = self.client.post(f"/api/guides/profiles/{self.guide.pk}/save/")
        self.assertEqual(res.status_code, 401)

    def test_inactive_guide_not_in_saved_list(self):
        GuideSave.objects.create(guide=self.guide, user=self.traveler)
        self.guide.is_active = False
        self.guide.save(update_fields=["is_active"])
        self.client.force_authenticate(user=self.traveler)
        saved_list = self.client.get("/api/guides/profiles/saved/")
        self.assertEqual(saved_list.status_code, 200)
        self.assertEqual(len(saved_list.data), 0)
