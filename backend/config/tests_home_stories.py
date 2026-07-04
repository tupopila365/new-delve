"""Live home stories API — auto-fill + fallback."""

import base64

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserType
from social.models import Post

User = get_user_model()

# 1×1 PNG
_TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def _image(name: str = "story.png") -> SimpleUploadedFile:
    return SimpleUploadedFile(name, _TINY_PNG, content_type="image/png")


class HomeStoriesApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(
            username="story_host",
            email="storyhost@test.local",
            password="pass12345",
        )
        profile = self.host.profile
        profile.user_type = UserType.SERVICE_PROVIDER
        profile.is_private = False
        profile.save()

        self.traveller = User.objects.create_user(
            username="story_traveller",
            email="storytrav@test.local",
            password="pass12345",
        )
        t_profile = self.traveller.profile
        t_profile.is_private = False
        t_profile.save()

    def test_empty_market_returns_fallback_channels(self):
        res = self.client.get("/api/home/stories/")
        self.assertEqual(res.status_code, 200)
        channels = res.data["channels"]
        self.assertEqual(len(channels), 6)
        ids = [c["id"] for c in channels]
        self.assertEqual(ids, ["stays", "go", "live", "eat", "tours", "pins"])
        stays = channels[0]
        self.assertTrue(stays["slides"])
        self.assertEqual(stays["slides"][0]["source"], "fallback")
        self.assertTrue(stays["slides"][0]["src"].startswith("https://"))

    def test_stays_channel_prefers_host_stories(self):
        Post.objects.create(
            author=self.host,
            body="Sunset at the lodge",
            region="Khomas",
            is_accommodation_story=True,
            image=_image(),
        )
        res = self.client.get("/api/home/stories/")
        self.assertEqual(res.status_code, 200)
        stays = next(c for c in res.data["channels"] if c["id"] == "stays")
        self.assertEqual(stays["slides"][0]["source"], "host_story")
        self.assertEqual(stays["slides"][0]["headline"], "Sunset at the lodge")
        self.assertTrue(stays["slides"][0]["id"].startswith("host-story-"))
        self.assertNotEqual(stays["slides"][0]["source"], "fallback")

    def test_pins_channel_uses_delvers_posts(self):
        Post.objects.create(
            author=self.traveller,
            body="Hidden viewpoint",
            region="Erongo",
            is_delvers=True,
            image=_image("pin.png"),
        )
        res = self.client.get("/api/home/stories/")
        self.assertEqual(res.status_code, 200)
        pins = next(c for c in res.data["channels"] if c["id"] == "pins")
        self.assertEqual(pins["slides"][0]["source"], "post")
        self.assertEqual(pins["slides"][0]["headline"], "Hidden viewpoint")
        self.assertIn("/delvers/posts/", pins["slides"][0]["cta_path"])

    def test_public_no_auth_required(self):
        res = self.client.get("/api/home/stories/")
        self.assertEqual(res.status_code, 200)
