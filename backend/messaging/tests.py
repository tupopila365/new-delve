from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Profile

from accommodation.models import AccommodationListing

from .models import Conversation, Message, make_pair_key

User = get_user_model()


class MessagingPhaseATests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = User.objects.create_user(
            username="alice_msg", email="alice_msg@test.local", password="pass12345"
        )
        self.bob = User.objects.create_user(
            username="bob_msg", email="bob_msg@test.local", password="pass12345"
        )
        self.closed = User.objects.create_user(
            username="closed_msg", email="closed_msg@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.alice).update(display_name="Alice", allow_messages=True)
        Profile.objects.filter(user=self.bob).update(display_name="Bob", allow_messages=True)
        Profile.objects.filter(user=self.closed).update(display_name="Closed", allow_messages=False)

    def _start(self, as_user, other_id):
        self.client.force_authenticate(user=as_user)
        return self.client.post("/api/messaging/start/", {"user_id": other_id}, format="json")

    def test_start_creates_conversation(self):
        res = self._start(self.alice, self.bob.id)
        self.assertEqual(res.status_code, 200)
        self.assertIn("id", res.data)
        self.assertEqual(res.data["unread_count"], 0)
        self.assertIsNone(res.data["last_message"])
        self.assertEqual(res.data["pair_key"], make_pair_key(self.alice.id, self.bob.id))
        self.assertEqual(res.data["other"]["username"], "bob_msg")
        self.assertEqual(res.data["other"]["display_name"], "Bob")

    def test_start_returns_existing_conversation(self):
        first = self._start(self.alice, self.bob.id)
        second = self._start(self.alice, self.bob.id)
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(Conversation.objects.count(), 1)

    def test_start_rejects_when_recipient_disables_messages(self):
        res = self._start(self.alice, self.closed.id)
        self.assertEqual(res.status_code, 403)

    def test_send_returns_message_object(self):
        start = self._start(self.alice, self.bob.id)
        cid = start.data["id"]
        res = self.client.post(
            f"/api/messaging/conversations/{cid}/messages/",
            {"body": "Hello Bob"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["body"], "Hello Bob")
        self.assertEqual(res.data["sender"], self.alice.id)
        self.assertEqual(res.data["sender_username"], "alice_msg")
        self.assertFalse(res.data["read"])
        self.assertIn("id", res.data)
        self.assertIn("created_at", res.data)

    def test_send_rejected_when_recipient_disables_messages(self):
        start = self._start(self.alice, self.bob.id)
        cid = start.data["id"]
        Profile.objects.filter(user=self.bob).update(allow_messages=False)
        res = self.client.post(
            f"/api/messaging/conversations/{cid}/messages/",
            {"body": "Still there?"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_mark_read_clears_unread_for_viewer(self):
        start = self._start(self.alice, self.bob.id)
        cid = start.data["id"]
        self.client.post(
            f"/api/messaging/conversations/{cid}/messages/",
            {"body": "Hi Bob"},
            format="json",
        )

        self.client.force_authenticate(user=self.bob)
        inbox = self.client.get("/api/messaging/conversations/")
        self.assertEqual(inbox.status_code, 200)
        row = next(c for c in inbox.data if c["id"] == cid)
        self.assertEqual(row["unread_count"], 1)

        read = self.client.post(f"/api/messaging/conversations/{cid}/read/")
        self.assertEqual(read.status_code, 200)
        self.assertEqual(read.data["marked_read"], 1)

        inbox2 = self.client.get("/api/messaging/conversations/")
        row2 = next(c for c in inbox2.data if c["id"] == cid)
        self.assertEqual(row2["unread_count"], 0)

        self.client.force_authenticate(user=self.alice)
        inbox_alice = self.client.get("/api/messaging/conversations/")
        row_alice = next(c for c in inbox_alice.data if c["id"] == cid)
        self.assertEqual(row_alice["unread_count"], 0)

    def test_mark_read_does_not_mark_own_messages(self):
        start = self._start(self.alice, self.bob.id)
        cid = start.data["id"]
        self.client.post(
            f"/api/messaging/conversations/{cid}/messages/",
            {"body": "From Alice"},
            format="json",
        )
        self.client.force_authenticate(user=self.alice)
        read = self.client.post(f"/api/messaging/conversations/{cid}/read/")
        self.assertEqual(read.data["marked_read"], 0)
        msg = Message.objects.get(conversation_id=cid)
        self.assertFalse(msg.read)

    def test_list_includes_last_message_preview(self):
        start = self._start(self.alice, self.bob.id)
        cid = start.data["id"]
        self.client.post(
            f"/api/messaging/conversations/{cid}/messages/",
            {"body": "Preview me"},
            format="json",
        )
        inbox = self.client.get("/api/messaging/conversations/")
        row = next(c for c in inbox.data if c["id"] == cid)
        self.assertIsNotNone(row["last_message"])
        self.assertEqual(row["last_message"]["body"], "Preview me")


class MessagingPhaseBTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = User.objects.create_user(
            username="alice_b", email="alice_b@test.local", password="pass12345"
        )
        self.bob = User.objects.create_user(
            username="bob_b", email="bob_b@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.alice).update(display_name="Alice B", allow_messages=True)
        Profile.objects.filter(user=self.bob).update(display_name="Bob B", allow_messages=True)

    def test_start_by_username(self):
        self.client.force_authenticate(user=self.alice)
        res = self.client.post("/api/messaging/start/", {"username": "bob_b"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["other"]["username"], "bob_b")
        self.assertEqual(res.data["pair_key"], make_pair_key(self.alice.id, self.bob.id))

    def test_start_by_username_is_case_insensitive(self):
        self.client.force_authenticate(user=self.alice)
        res = self.client.post("/api/messaging/start/", {"username": "BOB_B"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["other"]["id"], self.bob.id)

    def test_start_by_username_and_user_id_same_thread(self):
        self.client.force_authenticate(user=self.alice)
        by_name = self.client.post("/api/messaging/start/", {"username": "bob_b"}, format="json")
        by_id = self.client.post("/api/messaging/start/", {"user_id": self.bob.id}, format="json")
        self.assertEqual(by_name.data["id"], by_id.data["id"])
        self.assertEqual(Conversation.objects.count(), 1)

    def test_messages_paginated_envelope(self):
        self.client.force_authenticate(user=self.alice)
        start = self.client.post("/api/messaging/start/", {"username": "bob_b"}, format="json")
        cid = start.data["id"]
        for i in range(5):
            self.client.post(
                f"/api/messaging/conversations/{cid}/messages/",
                {"body": f"msg-{i}"},
                format="json",
            )
        page = self.client.get(f"/api/messaging/conversations/{cid}/messages/?limit=3")
        self.assertEqual(page.status_code, 200)
        self.assertIn("results", page.data)
        self.assertTrue(page.data["has_more"])
        self.assertEqual(len(page.data["results"]), 3)
        bodies = [m["body"] for m in page.data["results"]]
        self.assertEqual(bodies, ["msg-2", "msg-3", "msg-4"])
        older = self.client.get(
            f"/api/messaging/conversations/{cid}/messages/?limit=3&before_id={page.data['next_before_id']}"
        )
        self.assertEqual(older.status_code, 200)
        self.assertEqual(len(older.data["results"]), 2)
        self.assertFalse(older.data["has_more"])
        self.assertEqual([m["body"] for m in older.data["results"]], ["msg-0", "msg-1"])


class MessagingPhaseCTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.guest = User.objects.create_user(
            username="guest_c", email="guest_c@test.local", password="pass12345"
        )
        self.host = User.objects.create_user(
            username="host_c", email="host_c@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.guest).update(display_name="Guest C", allow_messages=True)
        Profile.objects.filter(user=self.host).update(display_name="Host C", allow_messages=True)
        self.listing = AccommodationListing.objects.create(
            owner=self.host,
            title="Sossusvlei Lodge",
            description="Desert stay",
            region="Hardap",
            city="Sesriem",
            is_active=True,
            price_per_night="900.00",
        )

    def test_start_with_listing_context(self):
        self.client.force_authenticate(user=self.guest)
        res = self.client.post(
            "/api/messaging/start/",
            {
                "username": "host_c",
                "context_type": "accommodation",
                "context_id": self.listing.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIsNotNone(res.data["context"])
        self.assertEqual(res.data["context"]["type"], "accommodation")
        self.assertEqual(res.data["context"]["id"], self.listing.id)
        self.assertEqual(res.data["context"]["label"], "Sossusvlei Lodge")
        self.assertEqual(res.data["context"]["href"], f"/accommodation/{self.listing.id}")

    def test_start_updates_context_on_existing_thread(self):
        self.client.force_authenticate(user=self.guest)
        first = self.client.post("/api/messaging/start/", {"username": "host_c"}, format="json")
        self.assertIsNone(first.data["context"])
        second = self.client.post(
            "/api/messaging/start/",
            {
                "username": "host_c",
                "context_type": "accommodation",
                "context_id": self.listing.id,
                "context_label": "Custom label",
            },
            format="json",
        )
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(second.data["context"]["label"], "Custom label")

    def test_invalid_context_type_ignored(self):
        self.client.force_authenticate(user=self.guest)
        res = self.client.post(
            "/api/messaging/start/",
            {"username": "host_c", "context_type": "spaceship", "context_id": 1},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data["context"])


class MessagingPeopleSearchTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = User.objects.create_user(
            username="alice_people", email="alice_people@test.local", password="pass12345"
        )
        self.bob = User.objects.create_user(
            username="bob_people", email="bob_people@test.local", password="pass12345"
        )
        self.slys = User.objects.create_user(
            username="slys", email="slys@test.local", password="pass12345"
        )
        self.hidden = User.objects.create_user(
            username="hidden_people", email="hidden_people@test.local", password="pass12345"
        )
        self.closed = User.objects.create_user(
            username="closed_people", email="closed_people@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.alice).update(display_name="Alice People", allow_messages=True)
        Profile.objects.filter(user=self.bob).update(
            display_name="Bob Traveller", allow_messages=True, city="Windhoek", region="Khomas"
        )
        Profile.objects.filter(user=self.slys).update(
            display_name="Slys Explorer", allow_messages=True, region="Erongo"
        )
        Profile.objects.filter(user=self.hidden).update(
            display_name="Hidden User", allow_messages=True, show_in_search=False
        )
        Profile.objects.filter(user=self.closed).update(display_name="Closed User", allow_messages=False)

    def test_people_search_requires_auth(self):
        res = self.client.get("/api/messaging/people/?q=slys")
        self.assertEqual(res.status_code, 401)

    def test_people_search_finds_username(self):
        self.client.force_authenticate(user=self.alice)
        res = self.client.get("/api/messaging/people/?q=slys")
        self.assertEqual(res.status_code, 200)
        usernames = [row["username"] for row in res.data["results"]]
        self.assertIn("slys", usernames)
        self.assertNotIn("alice_people", usernames)

    def test_people_search_finds_display_name(self):
        self.client.force_authenticate(user=self.alice)
        res = self.client.get("/api/messaging/people/?q=windhoek")
        self.assertEqual(res.status_code, 200)
        usernames = [row["username"] for row in res.data["results"]]
        self.assertIn("bob_people", usernames)

    def test_people_search_excludes_hidden_from_search(self):
        self.client.force_authenticate(user=self.alice)
        res = self.client.get("/api/messaging/people/?q=hidden")
        self.assertEqual(res.status_code, 200)
        usernames = [row["username"] for row in res.data["results"]]
        self.assertNotIn("hidden_people", usernames)

    def test_people_search_excludes_messages_disabled(self):
        self.client.force_authenticate(user=self.alice)
        res = self.client.get("/api/messaging/people/?q=closed")
        self.assertEqual(res.status_code, 200)
        usernames = [row["username"] for row in res.data["results"]]
        self.assertNotIn("closed_people", usernames)

    def test_people_search_excludes_blocked_user(self):
        self.client.force_authenticate(user=self.alice)
        block = self.client.post("/api/messaging/blocks/", {"username": "slys"}, format="json")
        self.assertIn(block.status_code, (200, 201))
        res = self.client.get("/api/messaging/people/?q=slys")
        self.assertEqual(res.status_code, 200)
        usernames = [row["username"] for row in res.data["results"]]
        self.assertNotIn("slys", usernames)

    def test_people_suggestions_include_recent_partner(self):
        self.client.force_authenticate(user=self.alice)
        start = self.client.post("/api/messaging/start/", {"username": "bob_people"}, format="json")
        self.assertEqual(start.status_code, 200)
        res = self.client.get("/api/messaging/people/")
        self.assertEqual(res.status_code, 200)
        usernames = [row["username"] for row in res.data["results"]]
        self.assertIn("bob_people", usernames)
        self.assertEqual(usernames[0], "bob_people")


class MessagingPhaseDTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = User.objects.create_user(
            username="alice_d", email="alice_d@test.local", password="pass12345"
        )
        self.bob = User.objects.create_user(
            username="bob_d", email="bob_d@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.alice).update(display_name="Alice D", allow_messages=True)
        Profile.objects.filter(user=self.bob).update(display_name="Bob D", allow_messages=True)

    def test_unread_count_endpoint(self):
        self.client.force_authenticate(user=self.alice)
        start = self.client.post("/api/messaging/start/", {"username": "bob_d"}, format="json")
        cid = start.data["id"]
        self.client.post(
            f"/api/messaging/conversations/{cid}/messages/",
            {"body": "Hello"},
            format="json",
        )
        self.client.force_authenticate(user=self.bob)
        res = self.client.get("/api/messaging/unread-count/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["unread"], 1)
        self.client.post(f"/api/messaging/conversations/{cid}/read/")
        res2 = self.client.get("/api/messaging/unread-count/")
        self.assertEqual(res2.data["unread"], 0)

    def test_typing_endpoint(self):
        self.client.force_authenticate(user=self.alice)
        start = self.client.post("/api/messaging/start/", {"username": "bob_d"}, format="json")
        cid = start.data["id"]
        ping = self.client.post(f"/api/messaging/conversations/{cid}/typing/")
        self.assertEqual(ping.status_code, 200)
        self.client.force_authenticate(user=self.bob)
        status_res = self.client.get(f"/api/messaging/conversations/{cid}/typing/")
        self.assertEqual(status_res.status_code, 200)
        usernames = [row["username"] for row in status_res.data["typing"]]
        self.assertIn("alice_d", usernames)

    def test_block_prevents_messaging(self):
        self.client.force_authenticate(user=self.alice)
        block = self.client.post("/api/messaging/blocks/", {"username": "bob_d"}, format="json")
        self.assertIn(block.status_code, (200, 201))
        start = self.client.post("/api/messaging/start/", {"username": "bob_d"}, format="json")
        self.assertEqual(start.status_code, 403)

        self.client.force_authenticate(user=self.bob)
        start_bob = self.client.post("/api/messaging/start/", {"username": "alice_d"}, format="json")
        self.assertEqual(start_bob.status_code, 403)

    def test_unblock_restores_messaging(self):
        self.client.force_authenticate(user=self.alice)
        self.client.post("/api/messaging/blocks/", {"username": "bob_d"}, format="json")
        unblock = self.client.delete(f"/api/messaging/blocks/{self.bob.id}/")
        self.assertEqual(unblock.status_code, 204)
        start = self.client.post("/api/messaging/start/", {"username": "bob_d"}, format="json")
        self.assertEqual(start.status_code, 200)
