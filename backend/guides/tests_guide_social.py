from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import UserType
from guides.models import GuideBooking, GuideQuestion, GuideReview, TourGuideProfile

User = get_user_model()


class GuideQaAndReviewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="guide_social_owner",
            email="gso@test.local",
            password="pass12345",
        )
        self.owner.profile.user_type = UserType.SERVICE_PROVIDER
        self.owner.profile.save()
        self.traveler = User.objects.create_user(
            username="guide_social_guest",
            email="gsg@test.local",
            password="pass12345",
        )
        self.traveler.profile.email_verified = True
        self.traveler.profile.save()
        self.guide = TourGuideProfile.objects.create(
            user=self.owner,
            headline="Social Guide",
            regions=["Khomas"],
            is_active=True,
        )

    def test_traveller_can_ask_and_guide_can_answer(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            f"/api/guides/profiles/{self.guide.pk}/questions/",
            {"body": "Do you offer hotel pickup?"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        question_id = res.data["id"]

        listed = self.client.get(f"/api/guides/profiles/{self.guide.pk}/questions/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)

        self.client.force_authenticate(user=self.owner)
        answer = self.client.post(
            f"/api/guides/questions/{question_id}/answers/",
            {"body": "Yes, pickup is included."},
            format="json",
        )
        self.assertEqual(answer.status_code, 201)
        self.assertTrue(answer.data["is_official"])

        listed = self.client.get(f"/api/guides/profiles/{self.guide.pk}/questions/")
        self.assertEqual(len(listed.data[0]["answers"]), 1)

        inbox = self.client.get("/api/accounts/provider/listing-questions/")
        self.assertEqual(inbox.status_code, 200)
        guide_rows = [r for r in inbox.data if r.get("category") == "guide"]
        self.assertTrue(any(r["id"] == question_id for r in guide_rows))

    def test_review_requires_completed_booking(self):
        self.client.force_authenticate(user=self.traveler)
        bad = self.client.post(
            f"/api/guides/profiles/{self.guide.pk}/review/",
            {"rating": 5, "body": "Great"},
            format="json",
        )
        self.assertEqual(bad.status_code, 400)

        GuideBooking.objects.create(
            guide=self.guide,
            client=self.traveler,
            date=(timezone.now() - timedelta(days=1)).date(),
            duration_hours=4,
            group_size=2,
            total_price="2000.00",
            status="completed",
        )
        detail = self.client.get(f"/api/guides/profiles/{self.guide.pk}/")
        self.assertTrue(detail.data["can_review"])
        self.assertFalse(detail.data["has_reviewed"])

        ok = self.client.post(
            f"/api/guides/profiles/{self.guide.pk}/review/",
            {"rating": 5, "body": "Amazing tour"},
            format="json",
        )
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(GuideReview.objects.filter(guide=self.guide).count(), 1)

        self.guide.refresh_from_db()
        self.assertEqual(self.guide.rating_count, 1)
        self.assertEqual(float(self.guide.rating_avg), 5.0)

        reviews = self.client.get(f"/api/guides/profiles/{self.guide.pk}/reviews/")
        self.assertEqual(reviews.status_code, 200)
        self.assertEqual(reviews.data["rating_count"], 1)
        self.assertTrue(any(r["source"] == "traveler" for r in reviews.data["reviews"]))

        detail2 = self.client.get(f"/api/guides/profiles/{self.guide.pk}/")
        self.assertTrue(detail2.data["has_reviewed"])
        self.assertFalse(detail2.data["can_review"])
