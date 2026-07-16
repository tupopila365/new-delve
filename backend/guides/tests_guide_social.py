from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import UserType
from guides.models import GuideBooking, GuideReview, TourGuideProfile
from social.models import Post

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

    def test_guide_moments_returns_tagged_delvers_posts(self):
        tagged = Post.objects.create(
            author=self.traveler,
            body="Amazing sunrise hike with this guide!",
            is_delvers=True,
            guide_profile=self.guide,
        )
        # A plain post (not tagged to this guide) must not leak in.
        Post.objects.create(author=self.traveler, body="Just a tip", is_delvers=True)

        res = self.client.get(f"/api/guides/profiles/{self.guide.pk}/moments/")
        self.assertEqual(res.status_code, 200)
        ids = [row["id"] for row in res.data]
        self.assertIn(tagged.id, ids)
        self.assertEqual(len(ids), 1)

    def test_tag_guide_requires_completed_booking(self):
        """Only travellers who actually attended (completed booking) may tag a guide."""
        self.client.force_authenticate(user=self.traveler)
        blocked = self.client.post(
            "/api/social/posts/",
            {"body": "Never booked this guide", "guide_profile": self.guide.pk},
            format="multipart",
        )
        self.assertEqual(blocked.status_code, 400, blocked.data)

        GuideBooking.objects.create(
            guide=self.guide,
            client=self.traveler,
            date=(timezone.now() - timedelta(days=2)).date(),
            duration_hours=4,
            group_size=2,
            total_price="2000.00",
            status="completed",
        )
        ok = self.client.post(
            "/api/social/posts/",
            {"body": "Tagged this guide", "guide_profile": self.guide.pk},
            format="multipart",
        )
        self.assertEqual(ok.status_code, 201, ok.data)
        self.assertTrue(ok.data["is_delvers"])
        self.assertEqual(ok.data["guide_profile"]["id"], self.guide.pk)

    def test_attended_flag_reflects_completed_booking(self):
        self.client.force_authenticate(user=self.traveler)
        before = self.client.get(f"/api/guides/profiles/{self.guide.pk}/")
        self.assertFalse(before.data["attended"])

        GuideBooking.objects.create(
            guide=self.guide,
            client=self.traveler,
            date=(timezone.now() - timedelta(days=1)).date(),
            duration_hours=4,
            group_size=2,
            total_price="2000.00",
            status="completed",
        )
        after = self.client.get(f"/api/guides/profiles/{self.guide.pk}/")
        self.assertTrue(after.data["attended"])

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
