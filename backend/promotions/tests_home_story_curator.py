"""Admin home story curator — editorial slides + auto-fill toggle."""

import base64

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserType
from promotions.models import HomeStoryChannelConfig, HomeStorySlide, HomeStorySourceType
from social.models import Post

User = get_user_model()

_TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def _image(name: str = "story.png") -> SimpleUploadedFile:
    return SimpleUploadedFile(name, _TINY_PNG, content_type="image/png")


class HomeStoryCuratorTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="story_admin",
            email="storyadmin@test.local",
            password="pass12345",
            is_staff=True,
        )
        self.host = User.objects.create_user(
            username="story_host_d",
            email="storyhostd@test.local",
            password="pass12345",
        )
        profile = self.host.profile
        profile.user_type = UserType.SERVICE_PROVIDER
        profile.is_private = False
        profile.save()

        self.host_post = Post.objects.create(
            author=self.host,
            body="Live host story",
            region="Khomas",
            is_accommodation_story=True,
            image=_image("live.png"),
        )

    def test_admin_channels_and_auto_fill_toggle(self):
        self.client.force_authenticate(user=self.admin)
        listed = self.client.get("/api/accounts/admin/home-story-channels/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 6)
        self.assertTrue(all(c["auto_fill"] for c in listed.data))

        patch = self.client.patch(
            "/api/accounts/admin/home-story-channels/stays/",
            {"auto_fill": False},
            format="json",
        )
        self.assertEqual(patch.status_code, 200)
        self.assertFalse(patch.data["auto_fill"])
        config = HomeStoryChannelConfig.objects.get(channel_id="stays")
        self.assertFalse(config.auto_fill)

    def test_editorial_slide_before_live_and_custom(self):
        self.client.force_authenticate(user=self.admin)
        custom = self.client.post(
            "/api/accounts/admin/home-story-slides/",
            {
                "channel_id": "stays",
                "source_type": HomeStorySourceType.CUSTOM,
                "media_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80",
                "headline": "Editor pick",
                "sub": "Curated",
                "cta_path": "/accommodation",
                "cta_label": "Browse stays",
            },
            format="json",
        )
        self.assertEqual(custom.status_code, 201)

        post_slide = self.client.post(
            "/api/accounts/admin/home-story-slides/",
            {
                "channel_id": "stays",
                "source_type": HomeStorySourceType.POST,
                "target_id": str(self.host_post.pk),
                "headline": "Pinned host story",
            },
            format="json",
        )
        self.assertEqual(post_slide.status_code, 201)

        public = self.client.get("/api/home/stories/")
        self.assertEqual(public.status_code, 200)
        stays = next(c for c in public.data["channels"] if c["id"] == "stays")
        self.assertEqual(stays["slides"][0]["source"], "editorial")
        self.assertEqual(stays["slides"][0]["headline"], "Editor pick")
        self.assertTrue(any(s["headline"] == "Pinned host story" for s in stays["slides"]))

    def test_auto_fill_off_uses_editorial_only_then_fallback(self):
        HomeStoryChannelConfig.objects.create(channel_id="pins", auto_fill=False)
        public = self.client.get("/api/home/stories/")
        pins = next(c for c in public.data["channels"] if c["id"] == "pins")
        self.assertFalse(pins["auto_fill"])
        self.assertEqual(pins["slides"][0]["source"], "fallback")

        HomeStorySlide.objects.create(
            channel_id="pins",
            source_type=HomeStorySourceType.CUSTOM,
            media_url="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=400&q=80",
            headline="Only editorial",
            cta_path="/delvers",
            is_active=True,
            sort_order=0,
            created_by=self.admin,
        )
        public2 = self.client.get("/api/home/stories/")
        pins2 = next(c for c in public2.data["channels"] if c["id"] == "pins")
        self.assertEqual(len(pins2["slides"]), 1)
        self.assertEqual(pins2["slides"][0]["headline"], "Only editorial")
        self.assertEqual(pins2["slides"][0]["source"], "editorial")

    def test_reorder_and_delete(self):
        self.client.force_authenticate(user=self.admin)
        a = self.client.post(
            "/api/accounts/admin/home-story-slides/",
            {
                "channel_id": "eat",
                "source_type": HomeStorySourceType.CUSTOM,
                "media_url": "https://example.com/a.jpg",
                "headline": "A",
                "cta_path": "/food",
            },
            format="json",
        ).data
        b = self.client.post(
            "/api/accounts/admin/home-story-slides/",
            {
                "channel_id": "eat",
                "source_type": HomeStorySourceType.CUSTOM,
                "media_url": "https://example.com/b.jpg",
                "headline": "B",
                "cta_path": "/food",
            },
            format="json",
        ).data
        reorder = self.client.post(
            "/api/accounts/admin/home-story-slides/reorder/",
            {"channel_id": "eat", "ordered_ids": [b["id"], a["id"]]},
            format="json",
        )
        self.assertEqual(reorder.status_code, 200)
        self.assertEqual([r["id"] for r in reorder.data], [b["id"], a["id"]])

        delete = self.client.delete(f"/api/accounts/admin/home-story-slides/{a['id']}/")
        self.assertEqual(delete.status_code, 204)
        self.assertFalse(HomeStorySlide.objects.filter(pk=a["id"]).exists())

    def test_non_admin_forbidden(self):
        self.client.force_authenticate(user=self.host)
        res = self.client.get("/api/accounts/admin/home-story-channels/")
        self.assertEqual(res.status_code, 403)
