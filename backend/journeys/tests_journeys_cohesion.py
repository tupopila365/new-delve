"""End-to-end Journeys cohesion smoke tests (Phase 3)."""

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Profile
from journeys.models import Journey, JourneyQuestion

User = get_user_model()


class JourneysCohesionSmokeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username="journey_creator", email="creator@journey.local", password="pass12345"
        )
        self.asker = User.objects.create_user(
            username="journey_asker", email="asker@journey.local", password="pass12345"
        )
        self.admin = User.objects.create_user(
            username="journey_admin",
            email="admin@journey.local",
            password="pass12345",
            is_staff=True,
        )
        Profile.objects.filter(user=self.author).update(
            display_name="Journey Creator",
            is_private=False,
            posts_visibility="public",
        )
        self.journey = Journey.objects.create(
            author=self.author,
            title="Cohesion dunes loop",
            summary="A test route through the Namib.",
            starts_on=date(2026, 4, 1),
            ends_on=date(2026, 4, 4),
            days=4,
            countries=["NA"],
            tags=["dunes", "4x4"],
            total_cost=Decimal("3200"),
        )

    def test_journey_question_on_detail_and_creator_inbox(self):
        self.client.force_authenticate(user=self.asker)
        q_url = f"/api/journeys/{self.journey.pk}/questions/"
        created = self.client.post(q_url, {"body": "Was gravel OK after rain?"}, format="json")
        self.assertEqual(created.status_code, 201)
        question_id = created.data["id"]

        listed = self.client.get(q_url)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)
        self.assertEqual(listed.data[0]["body"], "Was gravel OK after rain?")

        self.client.force_authenticate(user=self.author)
        answered = self.client.post(
            f"/api/journeys/questions/{question_id}/answers/",
            {"body": "Stick to the main track — side roads get slippery."},
            format="json",
        )
        self.assertEqual(answered.status_code, 201)
        self.assertTrue(answered.data["is_official"])

        inbox = self.client.get("/api/accounts/me/journey-questions/")
        self.assertEqual(inbox.status_code, 200)
        bodies = [row["body"] for row in inbox.data]
        self.assertIn("Was gravel OK after rain?", bodies)

    def test_moderation_hide_removes_journey_from_surfaces(self):
        self.client.force_authenticate(user=self.admin)
        hidden = self.client.patch(
            "/api/accounts/admin/moderation/",
            {
                "target_type": "journey",
                "target_id": str(self.journey.pk),
                "action": "remove",
                "reason": "Cohesion test hide",
            },
            format="json",
        )
        self.assertEqual(hidden.status_code, 200)
        self.journey.refresh_from_db()
        self.assertTrue(self.journey.is_hidden)

        self.client.force_authenticate(user=None)
        listed = self.client.get("/api/journeys/")
        titles = [row["title"] for row in listed.data]
        self.assertNotIn("Cohesion dunes loop", titles)

        profile = self.client.get("/api/journeys/?author=journey_creator")
        self.assertNotIn("Cohesion dunes loop", [row["title"] for row in profile.data])

        search = self.client.get("/api/search/?q=cohesion")
        self.assertEqual(search.status_code, 200)
        self.assertNotIn("Cohesion dunes loop", [row["title"] for row in search.data["journeys"]])

        detail = self.client.get(f"/api/journeys/{self.journey.pk}/")
        self.assertEqual(detail.status_code, 404)

    def test_moderation_hide_removes_journey_question(self):
        self.client.force_authenticate(user=self.asker)
        q_url = f"/api/journeys/{self.journey.pk}/questions/"
        created = self.client.post(q_url, {"body": "Hidden cohesion fuel question"}, format="json")
        self.assertEqual(created.status_code, 201)
        question_id = created.data["id"]

        self.client.force_authenticate(user=self.admin)
        hidden = self.client.patch(
            "/api/accounts/admin/moderation/",
            {
                "target_type": "journey_question",
                "target_id": str(question_id),
                "action": "remove",
                "reason": "Cohesion test hide question",
            },
            format="json",
        )
        self.assertEqual(hidden.status_code, 200)
        self.assertTrue(JourneyQuestion.objects.get(pk=question_id).is_hidden)

        self.client.force_authenticate(user=None)
        listed = self.client.get(q_url)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 0)

    def test_author_can_edit_and_delete_journey(self):
        self.client.force_authenticate(user=self.author)
        patched = self.client.patch(
            f"/api/journeys/{self.journey.pk}/",
            {"title": "Cohesion dunes loop (edited)", "summary": "Updated summary."},
            format="json",
        )
        self.assertEqual(patched.status_code, 200)
        self.assertEqual(patched.data["title"], "Cohesion dunes loop (edited)")
        self.assertEqual(patched.data["summary"], "Updated summary.")

        detail = self.client.get(f"/api/journeys/{self.journey.pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["title"], "Cohesion dunes loop (edited)")

        deleted = self.client.delete(f"/api/journeys/{self.journey.pk}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(Journey.objects.filter(pk=self.journey.pk).exists())

        gone = self.client.get(f"/api/journeys/{self.journey.pk}/")
        self.assertEqual(gone.status_code, 404)

    def test_share_journey_entry_creates_delvers_post(self):
        from journeys.models import JourneyEntry, JourneyStop
        from social.models import Post

        stop = JourneyStop.objects.create(
            journey=self.journey,
            order=0,
            place_name="Sossusvlei",
            region="Hardap",
            country_code="NA",
            arrived_on=date(2026, 4, 2),
            left_on=date(2026, 4, 2),
            notes="",
        )
        entry = JourneyEntry.objects.create(
            stop=stop,
            body="Sunrise over the dunes.",
            image="https://example.com/dunes.jpg",
        )

        self.client.force_authenticate(user=self.author)
        shared = self.client.post(f"/api/journeys/entries/{entry.pk}/share/")
        self.assertEqual(shared.status_code, 201)
        self.assertTrue(shared.data["is_delvers"])
        self.assertIn("Sunrise over the dunes.", shared.data["body"])
        self.assertIn("Cohesion dunes loop", shared.data["body"])

        post = Post.objects.get(pk=shared.data["id"])
        self.assertTrue(post.is_delvers)
        self.assertEqual(post.delvers_board, "Journeys")
        self.assertEqual(post.author_id, self.author.pk)

    def test_stop_linked_listing_round_trip(self):
        from accommodation.models import AccommodationListing

        stay = AccommodationListing.objects.create(
            owner=self.author,
            title="Cohesion camp",
            city="Sesriem",
            region="Hardap",
            price_per_night=Decimal("850"),
            max_guests=4,
            bedrooms=2,
            property_type="lodge",
            is_active=True,
        )
        self.client.force_authenticate(user=self.author)
        payload = {
            "title": "Linked stop journey",
            "summary": "Tests listing links on stops.",
            "starts_on": "2026-06-01",
            "ends_on": "2026-06-03",
            "days": 3,
            "countries": ["NA"],
            "transport_modes": ["car"],
            "party": "solo",
            "tags": ["camping"],
            "total_cost": "1200.00",
            "currency": "NAD",
            "stops": [
                {
                    "order": 0,
                    "place_name": "Sesriem",
                    "region": "Hardap",
                    "country_code": "NA",
                    "arrived_on": "2026-06-01",
                    "left_on": "2026-06-02",
                    "notes": "Booked the lodge.",
                    "linked_listing_type": "accommodation",
                    "linked_listing_id": stay.pk,
                    "entries": [],
                }
            ],
            "costs": [],
        }
        created = self.client.post("/api/journeys/", payload, format="json")
        self.assertEqual(created.status_code, 201)
        journey_id = created.data["id"]
        self.assertEqual(created.data["stops"][0]["linked_listing"]["title"], "Cohesion camp")
        self.assertEqual(created.data["stops"][0]["linked_listing"]["href"], f"/accommodation/{stay.pk}")

        detail = self.client.get(f"/api/journeys/{journey_id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["stops"][0]["linked_listing"]["kind"], "accommodation")
