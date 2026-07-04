"""Smoke tests for messaging & people discovery (Phases A–F)."""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import Profile
from config.throttles import MessagingPeopleSearchThrottle
from messaging.views import MessagingPeopleSearchView

_PEOPLE_SEARCH_THROTTLE_RATE = "2/min"

User = get_user_model()

_SMOKE_SETTINGS = {
    "REST_FRAMEWORK": {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_CLASSES": [],
    },
}


@override_settings(**_SMOKE_SETTINGS)
class MessagingDiscoverySmokeTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._orig_people_throttles = MessagingPeopleSearchView.throttle_classes
        MessagingPeopleSearchView.throttle_classes = []

    @classmethod
    def tearDownClass(cls):
        MessagingPeopleSearchView.throttle_classes = cls._orig_people_throttles
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        self.alice = User.objects.create_user(
            username="smoke_alice", email="smoke_alice@test.local", password="pass12345"
        )
        self.bob = User.objects.create_user(
            username="smoke_bob", email="smoke_bob@test.local", password="pass12345"
        )
        self.closed = User.objects.create_user(
            username="smoke_closed", email="smoke_closed@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.alice).update(
            display_name="Smoke Alice", allow_messages=True, show_in_search=True, region="Khomas"
        )
        Profile.objects.filter(user=self.bob).update(
            display_name="Smoke Bob", allow_messages=True, show_in_search=True, region="Khomas"
        )
        Profile.objects.filter(user=self.closed).update(
            display_name="Smoke Closed", allow_messages=False, show_in_search=True, region="Khomas"
        )

    def test_compose_people_search_finds_messageable_user(self):
        self.client.force_authenticate(user=self.alice)
        res = self.client.get("/api/messaging/people/?q=smoke_bob")
        self.assertEqual(res.status_code, 200)
        usernames = [row["username"] for row in res.data["results"]]
        self.assertIn("smoke_bob", usernames)
        self.assertNotIn("smoke_closed", usernames)

    def test_search_people_includes_can_message_hint(self):
        self.client.force_authenticate(user=self.alice)
        res = self.client.get("/api/search/?q=smoke&types=profile")
        self.assertEqual(res.status_code, 200)
        by_name = {row["username"]: row for row in res.data["users"]}
        self.assertTrue(by_name["smoke_bob"]["can_message"])
        self.assertFalse(by_name["smoke_closed"]["can_message"])

    def test_profile_to_message_start_creates_thread(self):
        self.client.force_authenticate(user=self.alice)
        start = self.client.post("/api/messaging/start/", {"username": "smoke_bob"}, format="json")
        self.assertEqual(start.status_code, 200)
        self.assertIn("id", start.data)
        conv_id = start.data["id"]
        msg = self.client.post(
            f"/api/messaging/conversations/{conv_id}/messages/",
            {"body": "Hello from smoke test"},
            format="json",
        )
        self.assertEqual(msg.status_code, 201)

    def test_allow_messages_false_blocks_new_thread(self):
        self.client.force_authenticate(user=self.alice)
        start = self.client.post("/api/messaging/start/", {"username": "smoke_closed"}, format="json")
        self.assertEqual(start.status_code, 403)

    def test_block_removes_user_from_people_search(self):
        self.client.force_authenticate(user=self.alice)
        block = self.client.post("/api/messaging/blocks/", {"username": "smoke_bob"}, format="json")
        self.assertIn(block.status_code, (200, 201))
        res = self.client.get("/api/messaging/people/?q=smoke_bob")
        self.assertEqual(res.status_code, 200)
        usernames = [row["username"] for row in res.data["results"]]
        self.assertNotIn("smoke_bob", usernames)
        start = self.client.post("/api/messaging/start/", {"username": "smoke_bob"}, format="json")
        self.assertEqual(start.status_code, 403)


class MessagingPeopleSearchThrottleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="throttle_user", email="throttle@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.user).update(allow_messages=True, show_in_search=True)
        self.client.force_authenticate(user=self.user)

    @override_settings(
        CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
        REST_FRAMEWORK={
            **settings.REST_FRAMEWORK,
            "DEFAULT_THROTTLE_RATES": {
                **settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
                "messaging_people_search": "2/min",
            },
        },
    )
    def test_people_search_rate_limited(self):
        # DRF caches THROTTLE_RATES on the class at import time; patch for this test.
        cache.clear()
        orig_rates = MessagingPeopleSearchThrottle.THROTTLE_RATES
        MessagingPeopleSearchThrottle.THROTTLE_RATES = {
            **orig_rates,
            "messaging_people_search": _PEOPLE_SEARCH_THROTTLE_RATE,
        }
        try:
            self.assertEqual(self.client.get("/api/messaging/people/").status_code, 200)
            self.assertEqual(self.client.get("/api/messaging/people/").status_code, 200)
            self.assertEqual(self.client.get("/api/messaging/people/").status_code, 429)
        finally:
            MessagingPeopleSearchThrottle.THROTTLE_RATES = orig_rates
            cache.clear()
