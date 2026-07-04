"""End-to-end Delvers cohesion smoke tests (Phase 18)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accommodation.models import AccommodationListing
from accounts.models import Profile

User = get_user_model()


def _post_bodies(payload) -> list[str]:
    return [p["body"] for p in payload if isinstance(p, dict) and "body" in p]


class DelversCohesionSmokeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username="cohesion_author", email="cohesion@test.local", password="pass12345"
        )
        self.admin = User.objects.create_user(
            username="cohesion_admin",
            email="admin@cohesion.local",
            password="pass12345",
            is_staff=True,
        )
        self.host = User.objects.create_user(
            username="cohesion_host", email="host@cohesion.local", password="pass12345"
        )
        Profile.objects.filter(user=self.host).update(user_type="service_provider")
        self.listing = AccommodationListing.objects.create(
            owner=self.host,
            title="Cohesion Camp",
            region="Hardap",
            city="Sesriem",
            price_per_night="850.00",
        )

    def test_delvers_post_surfaces_on_feed_profile_and_permalink(self):
        self.client.force_authenticate(user=self.author)
        created = self.client.post(
            "/api/social/posts/",
            {
                "body": "Cohesion Delvers moment",
                "region": "Hardap",
                "is_delvers": True,
                "listing": self.listing.pk,
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        post_id = created.data["id"]

        self.client.force_authenticate(user=None)
        delvers = self.client.get("/api/social/delvers/")
        self.assertEqual(delvers.status_code, 200)
        self.assertIn("Cohesion Delvers moment", _post_bodies(delvers.data))

        profile_posts = self.client.get(f"/api/social/users/{self.author.username}/posts/")
        self.assertEqual(profile_posts.status_code, 200)
        self.assertIn("Cohesion Delvers moment", [p["body"] for p in profile_posts.data])

        permalink = self.client.get(f"/api/social/posts/{post_id}/")
        self.assertEqual(permalink.status_code, 200)
        self.assertEqual(permalink.data["body"], "Cohesion Delvers moment")

        moments = self.client.get(f"/api/accommodation/listings/{self.listing.pk}/moments/")
        self.assertEqual(moments.status_code, 200)
        self.assertEqual(len(moments.data), 1)
        self.assertEqual(moments.data[0]["body"], "Cohesion Delvers moment")

    def test_moderation_hide_removes_post_from_all_surfaces(self):
        self.client.force_authenticate(user=self.author)
        created = self.client.post(
            "/api/social/posts/",
            {
                "body": "To be hidden",
                "region": "Hardap",
                "is_delvers": True,
                "listing": self.listing.pk,
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        post_id = created.data["id"]

        self.client.force_authenticate(user=self.admin)
        hidden = self.client.patch(
            "/api/accounts/admin/moderation/",
            {
                "target_type": "post",
                "target_id": str(post_id),
                "action": "remove",
                "reason": "Cohesion test hide",
            },
            format="json",
        )
        self.assertEqual(hidden.status_code, 200)

        self.client.force_authenticate(user=None)
        delvers = self.client.get("/api/social/delvers/")
        self.assertNotIn("To be hidden", _post_bodies(delvers.data))

        profile_posts = self.client.get(f"/api/social/users/{self.author.username}/posts/")
        self.assertNotIn("To be hidden", [p["body"] for p in profile_posts.data])

        moments = self.client.get(f"/api/accommodation/listings/{self.listing.pk}/moments/")
        self.assertEqual(len(moments.data), 0)

        permalink = self.client.get(f"/api/social/posts/{post_id}/")
        self.assertEqual(permalink.status_code, 404)
