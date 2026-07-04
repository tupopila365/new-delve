"""Ask locals Phase 2 — food listing Q&A tests."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from food.models import FoodQuestion, FoodVenue

User = get_user_model()


class FoodListingQuestionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="food_owner", email="food_owner@test.local", password="pass12345"
        )
        self.guest = User.objects.create_user(
            username="food_guest", email="food_guest@test.local", password="pass12345"
        )
        self.venue = FoodVenue.objects.create(
            owner=self.owner,
            name="River Cafe",
            region="Khomas",
            city="Windhoek",
        )

    def test_guest_can_ask_and_owner_can_answer(self):
        self.client.force_authenticate(user=self.guest)
        created = self.client.post(
            f"/api/food/venues/{self.venue.pk}/questions/",
            {"body": "Do you have vegan options?"},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        question_id = created.data["id"]

        listed = self.client.get(f"/api/food/venues/{self.venue.pk}/questions/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)

        self.client.force_authenticate(user=self.owner)
        answered = self.client.post(
            f"/api/food/questions/{question_id}/answers/",
            {"body": "Yes — ask your server for the daily vegan plate."},
            format="json",
        )
        self.assertEqual(answered.status_code, 201)
        self.assertTrue(answered.data["is_official"])

    def test_moderation_hides_food_question(self):
        question = FoodQuestion.objects.create(
            venue=self.venue,
            author=self.guest,
            body="Spam question",
        )
        self.client.force_authenticate(
            user=User.objects.create_user(
                username="food_admin",
                email="admin@food.local",
                password="pass12345",
                is_staff=True,
            )
        )
        hidden = self.client.patch(
            "/api/accounts/admin/moderation/",
            {
                "target_type": "food_question",
                "target_id": str(question.pk),
                "action": "remove",
                "reason": "Spam",
            },
            format="json",
        )
        self.assertEqual(hidden.status_code, 200)

        self.client.force_authenticate(user=None)
        listed = self.client.get(f"/api/food/venues/{self.venue.pk}/questions/")
        self.assertEqual(len(listed.data), 0)
