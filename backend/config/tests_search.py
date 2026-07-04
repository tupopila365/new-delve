from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Profile
from journeys.models import Journey
from social.models import Post

User = get_user_model()


class UnifiedSearchTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.visible = User.objects.create_user(
            username="searchable", email="searchable@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.visible).update(
            display_name="Searchable Nam",
            bio="Windhoek explorer",
            show_in_search=True,
            region="Khomas",
        )
        self.hidden = User.objects.create_user(
            username="ghost_user", email="ghost@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.hidden).update(
            display_name="Ghost User",
            show_in_search=False,
            region="Khomas",
        )

    def test_search_includes_discoverable_users_only(self):
        res = self.client.get("/api/search/?q=windhoek")
        self.assertEqual(res.status_code, 200)
        usernames = [u["username"] for u in res.data["users"]]
        self.assertIn("searchable", usernames)
        self.assertNotIn("ghost_user", usernames)

    def test_short_query_returns_empty_buckets(self):
        res = self.client.get("/api/search/?q=a")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["users"], [])
        self.assertEqual(res.data["questions"], [])
        self.assertEqual(res.data["journeys"], [])

    def test_types_profile_scopes_to_users_only(self):
        res = self.client.get("/api/search/?q=windhoek&types=profile")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data["users"]), 1)
        self.assertEqual(res.data["accommodation"], [])
        self.assertEqual(res.data["food"], [])
        self.assertEqual(res.data["journeys"], [])
        self.assertEqual(res.data["posts"], [])
        self.assertEqual(res.data["questions"], [])

    def test_search_user_can_message_when_authenticated(self):
        closed = User.objects.create_user(
            username="no_dm_user", email="nodm@test.local", password="pass12345"
        )
        Profile.objects.filter(user=closed).update(
            display_name="No DM User",
            bio="Windhoek local — messages disabled",
            show_in_search=True,
            allow_messages=False,
            region="Khomas",
        )
        viewer = User.objects.create_user(
            username="search_viewer", email="viewer@test.local", password="pass12345"
        )
        self.client.force_authenticate(user=viewer)
        res = self.client.get("/api/search/?q=windhoek&types=profile")
        self.assertEqual(res.status_code, 200)
        by_name = {row["username"]: row for row in res.data["users"]}
        self.assertTrue(by_name["searchable"]["can_message"])
        self.assertFalse(by_name["no_dm_user"]["can_message"])

    def test_search_user_omits_can_message_when_logged_out(self):
        res = self.client.get("/api/search/?q=windhoek&types=profile")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data["users"]), 1)
        self.assertNotIn("can_message", res.data["users"][0])

    def test_types_journeys_scopes_bucket(self):
        author = User.objects.create_user(
            username="type_journey", email="tj@test.local", password="pass12345"
        )
        Profile.objects.filter(user=author).update(is_private=False, posts_visibility="public")
        Journey.objects.create(
            author=author,
            title="Windhoek city loop",
            summary="Urban walk.",
            starts_on=date(2026, 7, 1),
            ends_on=date(2026, 7, 2),
            days=2,
            tags=["city"],
            total_cost=Decimal("100"),
        )
        res = self.client.get("/api/search/?q=windhoek&types=journeys")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["users"], [])
        titles = [j["title"] for j in res.data["journeys"]]
        self.assertIn("Windhoek city loop", titles)


class SearchJourneyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username="journey_searcher", email="jsearch@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.author).update(
            display_name="Journey Searcher",
            is_private=False,
            posts_visibility="public",
        )
        Journey.objects.create(
            author=self.author,
            title="Sossusvlei sunrise route",
            summary="Red dunes and early light.",
            starts_on=date(2026, 6, 1),
            ends_on=date(2026, 6, 4),
            days=4,
            tags=["dunes"],
            total_cost=Decimal("1200"),
        )

    def test_search_includes_journeys_bucket(self):
        res = self.client.get("/api/search/?q=sossus")
        self.assertEqual(res.status_code, 200)
        titles = [j["title"] for j in res.data["journeys"]]
        self.assertIn("Sossusvlei sunrise route", titles)


class ChangePasswordTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="pwd_user", email="pwd@test.local", password="OldPass123!"
        )
        self.client.force_authenticate(user=self.user)

    def test_change_password_success(self):
        res = self.client.post(
            "/api/accounts/me/change-password/",
            {"current_password": "OldPass123!", "new_password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass456!"))

    def test_change_password_rejects_wrong_current(self):
        res = self.client.post(
            "/api/accounts/me/change-password/",
            {"current_password": "wrong", "new_password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)


class SearchPostPrivacyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="private_poster", email="private_poster@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.owner).update(is_private=True, posts_visibility="public")
        Post.objects.create(author=self.owner, body="Secret dune photo", region="Namib")

    def test_private_author_posts_hidden_from_anonymous_search(self):
        res = self.client.get("/api/search/?q=dune")
        self.assertEqual(res.status_code, 200)
        bodies = [p["body"] for p in res.data["posts"]]
        self.assertNotIn("Secret dune photo", bodies)
