"""Live home stories API — auto-fill; empty markets omit stock rings."""

import base64

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from accommodation.models import AccommodationListing
from accounts.models import BusinessProfile, UserType, VerificationStatus
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

    def test_empty_market_omits_stock_fallback_channels(self):
        res = self.client.get("/api/home/stories/")
        self.assertEqual(res.status_code, 200)
        channels = res.data["channels"]
        self.assertEqual(channels, [])
        for channel in channels:
            self.assertFalse(any(s.get("source") == "fallback" for s in channel.get("slides", [])))

    def test_stays_channel_uses_host_highlights(self):
        listing = AccommodationListing.objects.create(
            owner=self.host,
            title="Sunset Lodge",
            region="Khomas",
            city="Windhoek",
            price_per_night="450.00",
            is_active=True,
            listing_stories=[
                {
                    "id": "spaces",
                    "label": "Spaces",
                    "slides": [
                        {
                            "id": "pool",
                            "kind": "image",
                            "src": "https://cdn.example/pool.jpg",
                            "headline": "Pool at sunset",
                        }
                    ],
                }
            ],
        )
        res = self.client.get("/api/home/stories/")
        self.assertEqual(res.status_code, 200)
        stays = next(c for c in res.data["channels"] if c["id"] == "stays")
        self.assertEqual(stays["slides"][0]["source"], "host_highlight")
        self.assertEqual(stays["slides"][0]["headline"], "Pool at sunset")
        self.assertTrue(stays["slides"][0]["id"].startswith("host-highlight-"))
        self.assertEqual(stays["slides"][0]["cta_path"], f"/accommodation/{listing.pk}")
        self.assertNotEqual(stays["slides"][0]["source"], "fallback")

    def test_stays_ignores_legacy_host_stories_and_listing_covers(self):
        listing = AccommodationListing.objects.create(
            owner=self.host,
            title="Coast Lodge",
            region="Erongo",
            city="Swakopmund",
            price_per_night="450.00",
            cover_image="https://cdn.example/coast.jpg",
            is_active=True,
        )
        Post.objects.create(
            author=self.host,
            body="Morning dunes",
            region="Erongo",
            is_accommodation_story=True,
            image=_image(),
            listing=listing,
        )
        AccommodationListing.objects.create(
            owner=self.host,
            title="Desert Cabin",
            region="Hardap",
            city="Mariental",
            price_per_night="320.00",
            cover_image="https://cdn.example/cabin.jpg",
            is_active=True,
        )
        res = self.client.get("/api/home/stories/")
        self.assertFalse(any(c["id"] == "stays" for c in res.data["channels"]))

    def test_stays_channel_hides_suspended_business_highlights(self):
        business = BusinessProfile.objects.create(
            owner=self.host,
            business_name="Suspended Stay",
            slug="suspended-stay",
            business_types=["accommodation"],
            verification_status=VerificationStatus.SUSPENDED,
        )
        AccommodationListing.objects.create(
            owner=self.host,
            business=business,
            title="Unavailable Lodge",
            region="Khomas",
            city="Windhoek",
            price_per_night="450.00",
            is_active=True,
            listing_stories=[
                {
                    "id": "spaces",
                    "label": "Spaces",
                    "slides": [
                        {
                            "id": "pool",
                            "kind": "image",
                            "src": "https://cdn.example/pool.jpg",
                        }
                    ],
                }
            ],
        )
        res = self.client.get("/api/home/stories/")
        self.assertFalse(any(c["id"] == "stays" for c in res.data["channels"]))

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
