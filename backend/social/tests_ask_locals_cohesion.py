"""End-to-end Ask locals cohesion smoke tests (Phase D)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accommodation.models import AccommodationListing, AccommodationQuestion
from accounts.models import Profile, UserType
from social.models import Post

User = get_user_model()


def _post_bodies(payload) -> list[str]:
    return [p["body"] for p in payload if isinstance(p, dict) and "body" in p]


def _question_bodies(payload) -> list[str]:
    return [q["body"] for q in payload if isinstance(q, dict) and "body" in q]


class AskLocalsCohesionSmokeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.asker = User.objects.create_user(
            username="cohesion_asker", email="asker@cohesion.local", password="pass12345"
        )
        self.local = User.objects.create_user(
            username="cohesion_local", email="local@cohesion.local", password="pass12345"
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
        Profile.objects.filter(user=self.host).update(user_type=UserType.SERVICE_PROVIDER)
        self.host.profile.refresh_from_db()
        self.listing = AccommodationListing.objects.create(
            owner=self.host,
            title="Cohesion Lodge",
            region="Khomas",
            city="Windhoek",
            price_per_night="900.00",
        )

    def test_community_question_surfaces_on_feed_profile_and_permalink(self):
        self.client.force_authenticate(user=self.asker)
        created = self.client.post(
            "/api/social/posts/",
            {
                "body": "Where can I buy a local SIM on Sunday in Windhoek?",
                "region": "Khomas",
                "place_label": "Windhoek, Namibia",
                "post_kind": "question",
                "is_delvers": False,
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["post_kind"], "question")
        post_id = created.data["id"]

        self.client.force_authenticate(user=None)
        community = self.client.get("/api/social/feed/")
        self.assertEqual(community.status_code, 200)
        self.assertIn("Where can I buy a local SIM on Sunday in Windhoek?", _post_bodies(community.data))

        questions = self.client.get("/api/social/feed/?kind=question&limit=4")
        self.assertEqual(questions.status_code, 200)
        self.assertIn("Where can I buy a local SIM on Sunday in Windhoek?", _post_bodies(questions.data))

        delvers = self.client.get("/api/social/delvers/")
        self.assertEqual(delvers.status_code, 200)
        self.assertNotIn("Where can I buy a local SIM on Sunday in Windhoek?", _post_bodies(delvers.data))

        profile_posts = self.client.get(f"/api/social/users/{self.asker.username}/posts/")
        self.assertEqual(profile_posts.status_code, 200)
        self.assertIn(
            "Where can I buy a local SIM on Sunday in Windhoek?",
            [p["body"] for p in profile_posts.data],
        )

        permalink = self.client.get(f"/api/social/posts/{post_id}/")
        self.assertEqual(permalink.status_code, 200)
        self.assertEqual(permalink.data["post_kind"], "question")
        self.assertEqual(permalink.data["body"], "Where can I buy a local SIM on Sunday in Windhoek?")

    def test_comment_answer_updates_question_count(self):
        self.client.force_authenticate(user=self.asker)
        created = self.client.post(
            "/api/social/posts/",
            {
                "body": "Is it safe to drive to Sossusvlei at night?",
                "region": "Hardap",
                "post_kind": "question",
                "is_delvers": False,
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        post_id = created.data["id"]

        detail_before = self.client.get(f"/api/social/posts/{post_id}/")
        self.assertEqual(detail_before.data.get("comments_count", 0), 0)

        self.client.force_authenticate(user=self.local)
        answered = self.client.post(
            f"/api/social/posts/{post_id}/comments/",
            {"body": "Stick to daylight — gravel sections are hard to see after dark."},
            format="json",
        )
        self.assertEqual(answered.status_code, 201)

        detail_after = self.client.get(f"/api/social/posts/{post_id}/")
        self.assertEqual(detail_after.status_code, 200)
        self.assertEqual(detail_after.data["comments_count"], 1)

        comments = self.client.get(f"/api/social/posts/{post_id}/comments/")
        self.assertEqual(comments.status_code, 200)
        self.assertEqual(len(comments.data), 1)
        self.assertIn("daylight", comments.data[0]["body"])

        feed = self.client.get("/api/social/feed/?kind=question")
        match = next((p for p in feed.data if isinstance(p, dict) and p.get("id") == post_id), None)
        self.assertIsNotNone(match)
        self.assertEqual(match["comments_count"], 1)

    def test_moderation_hide_removes_question_from_feed_search_and_home_preview(self):
        self.client.force_authenticate(user=self.asker)
        created = self.client.post(
            "/api/social/posts/",
            {
                "body": "Hidden cohesion SIM question",
                "region": "Khomas",
                "place_label": "Windhoek",
                "post_kind": "question",
                "is_delvers": False,
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
        self.assertTrue(Post.objects.get(pk=post_id).is_hidden)

        self.client.force_authenticate(user=None)
        community = self.client.get("/api/social/feed/")
        self.assertNotIn("Hidden cohesion SIM question", _post_bodies(community.data))

        home_preview = self.client.get("/api/social/feed/?kind=question&limit=4")
        self.assertNotIn("Hidden cohesion SIM question", _post_bodies(home_preview.data))

        search = self.client.get("/api/search/?q=cohesion")
        self.assertEqual(search.status_code, 200)
        self.assertNotIn("Hidden cohesion SIM question", _question_bodies(search.data["questions"]))

        profile_posts = self.client.get(f"/api/social/users/{self.asker.username}/posts/")
        self.assertNotIn("Hidden cohesion SIM question", [p["body"] for p in profile_posts.data])

        permalink = self.client.get(f"/api/social/posts/{post_id}/")
        self.assertEqual(permalink.status_code, 404)

    def test_listing_question_on_detail_provider_inbox_and_moderation_hide(self):
        self.client.force_authenticate(user=self.asker)
        q_url = f"/api/accommodation/listings/{self.listing.pk}/questions/"
        created = self.client.post(q_url, {"body": "Do you allow late check-in?"}, format="json")
        self.assertEqual(created.status_code, 201)
        question_id = created.data["id"]

        listed = self.client.get(q_url)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)
        self.assertEqual(listed.data[0]["body"], "Do you allow late check-in?")

        self.host = User.objects.select_related("profile").get(pk=self.host.pk)
        self.client.force_authenticate(user=self.host)
        answered = self.client.post(
            f"/api/accommodation/questions/{question_id}/answers/",
            {"body": "Yes — message us on arrival day with your ETA."},
            format="json",
        )
        self.assertEqual(answered.status_code, 201)
        self.assertTrue(answered.data["is_official"])

        inbox = self.client.get("/api/accounts/provider/listing-questions/")
        self.assertEqual(inbox.status_code, 200)
        bodies = [row["body"] for row in inbox.data if isinstance(row, dict)]
        self.assertIn("Do you allow late check-in?", bodies)
        stay_row = next(row for row in inbox.data if row.get("category") == "stay")
        self.assertEqual(stay_row["listing_title"], "Cohesion Lodge")
        self.assertEqual(len(stay_row["answers"]), 1)

        self.client.force_authenticate(user=self.admin)
        hidden = self.client.patch(
            "/api/accounts/admin/moderation/",
            {
                "target_type": "accommodation_question",
                "target_id": str(question_id),
                "action": "remove",
                "reason": "Cohesion listing Q&A hide",
            },
            format="json",
        )
        self.assertEqual(hidden.status_code, 200)
        self.assertTrue(AccommodationQuestion.objects.get(pk=question_id).is_hidden)

        self.client.force_authenticate(user=None)
        listed_after = self.client.get(q_url)
        self.assertEqual(len(listed_after.data), 0)

        self.host = User.objects.select_related("profile").get(pk=self.host.pk)
        self.client.force_authenticate(user=self.host)
        inbox_after = self.client.get("/api/accounts/provider/listing-questions/")
        bodies_after = [row["body"] for row in inbox_after.data if isinstance(row, dict)]
        self.assertNotIn("Do you allow late check-in?", bodies_after)
