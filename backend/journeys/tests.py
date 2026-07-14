from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from journeys.models import Journey

User = get_user_model()


class JourneyApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username="journey_author", email="journey@test.local", password="pass12345"
        )

    def test_create_list_and_retrieve_journey(self):
        self.client.force_authenticate(user=self.author)
        payload = {
            "title": "Etosha long weekend",
            "summary": "Quick wildlife loop.",
            "cover_image": "https://example.com/cover.jpg",
            "starts_on": "2026-04-01",
            "ends_on": "2026-04-03",
            "days": 3,
            "countries": ["NA"],
            "transport_modes": ["car"],
            "party": "couple",
            "tags": ["wildlife"],
            "total_cost": "4500.00",
            "currency": "NAD",
            "stops": [
                {
                    "order": 0,
                    "place_name": "Etosha",
                    "region": "Oshikoto",
                    "country_code": "NA",
                    "arrived_on": "2026-04-01",
                    "left_on": "2026-04-03",
                    "notes": "Booked rest camp inside the park.",
                    "cost": "3000.00",
                    "entries": [
                        {
                            "body": "Elephants at the waterhole.",
                            "image": "https://example.com/elephant.jpg",
                            "video": "",
                            "happened_at": "2026-04-02",
                        }
                    ],
                }
            ],
            "costs": [{"category": "stay", "amount": "3000.00", "note": "Camp fees"}],
        }
        created = self.client.post("/api/journeys/", payload, format="json")
        self.assertEqual(created.status_code, 201)
        journey_id = created.data["id"]
        self.assertEqual(created.data["author"]["username"], "journey_author")
        self.assertEqual(len(created.data["stops"]), 1)

        listed = self.client.get("/api/journeys/")
        self.assertEqual(listed.status_code, 200)
        titles = [j["title"] for j in listed.data]
        self.assertIn("Etosha long weekend", titles)

        self.client.force_authenticate(user=None)
        detail = self.client.get(f"/api/journeys/{journey_id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["stops"][0]["place_name"], "Etosha")

    def test_author_filter_on_profile(self):
        Journey.objects.create(
            author=self.author,
            title="Profile journey",
            starts_on=date(2026, 1, 1),
            ends_on=date(2026, 1, 3),
            days=3,
            total_cost=Decimal("100"),
        )
        res = self.client.get("/api/journeys/?author=journey_author")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_feed_query_filters_search_mode_and_sort(self):
        Journey.objects.create(
            author=self.author,
            title="Coastal Swakop loop",
            summary="Seafood and dunes.",
            starts_on=date(2026, 5, 1),
            ends_on=date(2026, 5, 3),
            days=3,
            tags=["coast"],
            total_cost=Decimal("2200"),
        )
        Journey.objects.create(
            author=self.author,
            title="Budget Fish River",
            starts_on=date(2026, 6, 1),
            ends_on=date(2026, 6, 4),
            days=4,
            tags=["budget"],
            total_cost=Decimal("1800"),
        )
        searched = self.client.get("/api/journeys/?q=Swakop")
        self.assertEqual(searched.status_code, 200)
        self.assertEqual([j["title"] for j in searched.data], ["Coastal Swakop loop"])

        coast = self.client.get("/api/journeys/?mode=coast")
        self.assertEqual(coast.status_code, 200)
        self.assertEqual([j["title"] for j in coast.data], ["Coastal Swakop loop"])

        budget = self.client.get("/api/journeys/?mode=budget&sort=popular")
        self.assertEqual(budget.status_code, 200)
        titles = [j["title"] for j in budget.data]
        self.assertIn("Budget Fish River", titles)
        self.assertIn("Coastal Swakop loop", titles)

    def test_like_and_save_toggle_counts(self):
        journey = Journey.objects.create(
            author=self.author,
            title="Engagement journey",
            starts_on=date(2026, 2, 1),
            ends_on=date(2026, 2, 3),
            days=3,
            total_cost=Decimal("100"),
        )
        viewer = User.objects.create_user(
            username="journey_fan", email="fan@test.local", password="pass12345"
        )
        self.client.force_authenticate(user=viewer)
        like = self.client.post(f"/api/journeys/{journey.id}/like/")
        self.assertEqual(like.status_code, 200)
        self.assertTrue(like.data["liked"])
        self.assertEqual(like.data["likes_count"], 1)
        unlike = self.client.post(f"/api/journeys/{journey.id}/like/")
        self.assertFalse(unlike.data["liked"])
        self.assertEqual(unlike.data["likes_count"], 0)
        save = self.client.post(f"/api/journeys/{journey.id}/save/")
        self.assertTrue(save.data["saved"])
        self.assertEqual(save.data["saves_count"], 1)

    def test_similar_journeys_by_tags(self):
        a = Journey.objects.create(
            author=self.author,
            title="Dune loop",
            starts_on=date(2026, 3, 1),
            ends_on=date(2026, 3, 4),
            days=4,
            countries=["NA"],
            tags=["dunes", "4x4"],
            total_cost=Decimal("500"),
        )
        Journey.objects.create(
            author=self.author,
            title="Coast run",
            starts_on=date(2026, 4, 1),
            ends_on=date(2026, 4, 3),
            days=3,
            countries=["ZA"],
            tags=["coast"],
            total_cost=Decimal("300"),
        )
        Journey.objects.create(
            author=self.author,
            title="Another dune trip",
            starts_on=date(2026, 5, 1),
            ends_on=date(2026, 5, 3),
            days=3,
            countries=["NA"],
            tags=["dunes"],
            total_cost=Decimal("400"),
        )
        res = self.client.get(f"/api/journeys/{a.id}/similar/")
        self.assertEqual(res.status_code, 200)
        titles = [row["title"] for row in res.data]
        self.assertIn("Another dune trip", titles)
        self.assertNotIn("Dune loop", titles)
        self.assertNotIn("Coast run", titles)

    def test_author_can_save_journey_stories(self):
        journey = Journey.objects.create(
            author=self.author,
            title="Stories journey",
            starts_on=date(2026, 6, 1),
            ends_on=date(2026, 6, 5),
            days=5,
            total_cost=Decimal("800"),
        )
        stories = [
            {
                "id": "sunrise",
                "label": "Dune sunrise",
                "coverSrc": "https://cdn.example/sunrise.jpg",
                "slides": [
                    {
                        "src": "https://cdn.example/sunrise.jpg",
                        "headline": "First light on the dunes",
                        "sub": "Day 2 start",
                        "captionX": 42,
                        "captionY": 78,
                    }
                ],
            }
        ]
        self.client.force_authenticate(user=self.author)
        res = self.client.patch(
            f"/api/journeys/{journey.id}/",
            {"journey_stories": stories},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["journey_stories"]), 1)
        self.assertEqual(res.data["journey_stories"][0]["label"], "Dune sunrise")
        journey.refresh_from_db()
        self.assertEqual(journey.journey_stories[0]["slides"][0]["headline"], "First light on the dunes")
        self.assertEqual(journey.journey_stories[0]["slides"][0]["captionX"], 42.0)
        self.assertEqual(journey.journey_stories[0]["slides"][0]["captionY"], 78.0)

        self.client.force_authenticate(user=None)
        detail = self.client.get(f"/api/journeys/{journey.id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(len(detail.data["journey_stories"]), 1)
