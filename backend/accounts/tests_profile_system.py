"""Cross-cutting smoke tests for the cohesive profile system (Phases 1–6)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import AdminAuditLog, BusinessProfile, Profile, UserType, UserType
from social.models import Follow, Post

User = get_user_model()


class ProfileSystemSmokeTests(TestCase):
    """End-to-end checks tying privacy, search, social, messaging, and admin together."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="smoke_admin", email="admin@smoke.local", password="pass12345", is_staff=True
        )
        self.traveler = User.objects.create_user(
            username="smoke_trav", email="trav@smoke.local", password="pass12345"
        )
        Profile.objects.filter(user=self.traveler).update(
            display_name="Smoke Traveller",
            show_in_search=True,
            allow_messages=True,
            region="Khomas",
        )
        self.private_user = User.objects.create_user(
            username="smoke_private", email="private@smoke.local", password="pass12345"
        )
        Profile.objects.filter(user=self.private_user).update(
            is_private=True,
            show_in_search=False,
            allow_messages=False,
        )
        Post.objects.create(author=self.private_user, body="Private smoke post", is_delvers=True)
        Post.objects.create(author=self.traveler, body="Public Windhoek moment", is_delvers=False)

    def test_public_profile_lists_owned_businesses(self):
        provider = User.objects.create_user(
            username="smoke_provider", email="prov@smoke.local", password="pass12345"
        )
        Profile.objects.filter(user=provider).update(user_type=UserType.SERVICE_PROVIDER)
        BusinessProfile.objects.create(
            owner=provider,
            slug="smoke-stays",
            business_name="Smoke Stays",
            business_types=["accommodation"],
        )
        res = self.client.get("/api/accounts/users/smoke_provider/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["owned_businesses"]), 1)
        self.assertEqual(res.data["owned_businesses"][0]["business_name"], "Smoke Stays")

    def test_private_user_hidden_from_search_and_posts(self):
        search = self.client.get("/api/search/?q=smoke")
        self.assertEqual(search.status_code, 200)
        usernames = [u["username"] for u in search.data["users"]]
        self.assertIn("smoke_trav", usernames)
        self.assertNotIn("smoke_private", usernames)

        posts = self.client.get("/api/social/users/smoke_private/posts/")
        self.assertEqual(posts.status_code, 200)
        self.assertEqual(posts.data, [])

    def test_follow_unlocks_private_profile_posts(self):
        self.client.force_authenticate(user=self.traveler)
        toggle = self.client.post("/api/social/users/smoke_private/follow/")
        self.assertEqual(toggle.status_code, 200)
        self.assertTrue(toggle.data["following"])

        posts = self.client.get("/api/social/users/smoke_private/posts/")
        self.assertEqual(len(posts.data), 1)
        self.assertEqual(posts.data[0]["body"], "Private smoke post")

    def test_messaging_blocked_when_disabled(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            "/api/messaging/start/",
            {"user_id": self.private_user.pk},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_admin_inspector_and_suspend_audit(self):
        self.client.force_authenticate(user=self.admin)
        profile = self.client.get(f"/api/accounts/admin/users/{self.traveler.pk}/profile/")
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.data["user"]["username"], "smoke_trav")
        self.assertGreaterEqual(profile.data["stats"]["posts_count"], 1)

        suspend = self.client.patch(
            f"/api/accounts/admin/users/{self.traveler.pk}/update/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(suspend.status_code, 200)
        self.assertTrue(
            AdminAuditLog.objects.filter(
                action="user_suspend",
                target_type="user",
                target_id=str(self.traveler.pk),
            ).exists()
        )

    def test_public_profile_stats_and_relationship(self):
        self.client.force_authenticate(user=self.traveler)
        Follow.objects.create(follower=self.traveler, following=self.private_user)
        res = self.client.get("/api/accounts/users/smoke_private/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["relationship"]["is_following"])
        self.assertTrue(res.data["relationship"]["can_view_posts"])
        self.assertFalse(res.data["relationship"]["can_message"])
        self.assertIn("posts_count", res.data["stats"])

    def test_private_profile_minimal_for_strangers(self):
        res = self.client.get("/api/accounts/users/smoke_private/")
        self.assertEqual(res.status_code, 200)
        self.assertNotIn("bio", res.data)
        self.assertNotIn("stats", res.data)
        self.assertFalse(res.data["relationship"]["can_view_posts"])
