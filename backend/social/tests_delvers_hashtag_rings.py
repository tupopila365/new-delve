from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Profile
from social.models import Follow, Post, TagFollow
from tags.models import Tag

from django.contrib.auth import get_user_model


User = get_user_model()


class DelversHashtagRingsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.viewer = User.objects.create_user(username="viewer", email="viewer@test.local", password="pass12345")
        self.client.force_authenticate(user=self.viewer)

        self.public_author = User.objects.create_user(
            username="public_author",
            email="public_author@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.public_author).update(is_private=False)

        self.private_author = User.objects.create_user(
            username="private_author",
            email="private_author@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.private_author).update(is_private=True)

        # Even if the viewer follows the private author, hashtag rings must exclude them always.
        Follow.objects.create(follower=self.viewer, following=self.private_author)

    def test_hashtag_rings_grouping_includes_posts_and_highlights_excludes_private_authors(self):
        Post.objects.create(
            author=self.public_author,
            body="Normal delvers post about #Dalmatians",
            region="Khomas",
            is_delvers=True,
            is_delvers_highlight=False,
            image="posts/dal.jpg",
        )
        Post.objects.create(
            author=self.public_author,
            body="Highlight moment with #dalmatians",
            region="Khomas",
            is_delvers=True,
            is_delvers_highlight=True,
            image="posts/dal2.jpg",
        )
        Post.objects.create(
            author=self.private_author,
            body="Private delvers #Dalmatians",
            region="Khomas",
            is_delvers=True,
            is_delvers_highlight=False,
            image="posts/private.jpg",
        )
        Post.objects.create(
            author=self.private_author,
            body="Private highlight #dalmatians",
            region="Khomas",
            is_delvers=True,
            is_delvers_highlight=True,
            image="posts/private2.jpg",
        )

        res = self.client.get("/api/social/delvers/hashtag-rings/")
        self.assertEqual(res.status_code, 200)

        rings = res.data.get("rings", [])
        ring = next((r for r in rings if r.get("tag_slug") == "dalmatians"), None)
        self.assertIsNotNone(ring)

        bodies = [p.get("body") for p in ring.get("posts", []) if isinstance(p, dict)]
        self.assertIn("Normal delvers post about #Dalmatians", bodies)
        self.assertIn("Highlight moment with #dalmatians", bodies)
        self.assertNotIn("Private delvers #Dalmatians", bodies)
        self.assertNotIn("Private highlight #dalmatians", bodies)

    def test_hashtag_rings_expire_after_24_hours(self):
        fresh = Post.objects.create(
            author=self.public_author,
            body="Fresh #Dalmatians",
            region="Khomas",
            is_delvers=True,
            is_delvers_highlight=True,
            image="posts/fresh.jpg",
        )
        expired = Post.objects.create(
            author=self.public_author,
            body="Expired #Dalmatians",
            region="Khomas",
            is_delvers=True,
            is_delvers_highlight=True,
            image="posts/expired.jpg",
        )
        Post.objects.filter(pk=expired.pk).update(created_at=timezone.now() - timedelta(hours=25))

        res = self.client.get("/api/social/delvers/hashtag-rings/")
        self.assertEqual(res.status_code, 200)

        rings = res.data.get("rings", [])
        ring = next((r for r in rings if r.get("tag_slug") == "dalmatians"), None)
        self.assertIsNotNone(ring)

        bodies = [p.get("body") for p in ring.get("posts", []) if isinstance(p, dict)]
        self.assertIn("Fresh #Dalmatians", bodies)
        self.assertNotIn("Expired #Dalmatians", bodies)

    def test_followed_hashtag_rings_are_prioritized_and_marked(self):
        safari = Tag.objects.create(slug="safari")
        TagFollow.objects.create(user=self.viewer, tag=safari)
        Post.objects.create(
            author=self.public_author,
            body="Quiet #beach",
            region="Erongo",
            is_delvers=True,
            is_delvers_highlight=True,
            image="posts/beach.jpg",
        )
        Post.objects.create(
            author=self.public_author,
            body="Fresh #safari",
            region="Kunene",
            is_delvers=True,
            is_delvers_highlight=True,
            image="posts/safari.jpg",
        )

        res = self.client.get("/api/social/delvers/hashtag-rings/")
        self.assertEqual(res.status_code, 200)

        rings = res.data.get("rings", [])
        self.assertGreaterEqual(len(rings), 2)
        self.assertEqual(rings[0].get("tag_slug"), "safari")
        self.assertTrue(rings[0].get("followed_by_me"))
        self.assertEqual(rings[0].get("followers_count"), 1)

    def test_follow_hashtag_toggle(self):
        res = self.client.post("/api/social/delvers/tags/Safari/follow/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["tag_slug"], "safari")
        self.assertTrue(res.data["following"])
        self.assertEqual(res.data["followers_count"], 1)

        res = self.client.post("/api/social/delvers/tags/safari/follow/")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["following"])
        self.assertEqual(res.data["followers_count"], 0)

