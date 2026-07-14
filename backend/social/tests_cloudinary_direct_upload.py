import hashlib
import os
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from config.cloudinary_media import cloudinary_video_delivery_url
from config.cloudinary_upload import (
    normalize_remote_media_ref,
    public_id_from_cloudinary_url,
    sign_upload,
)

User = get_user_model()

_CLOUDINARY_URL = "cloudinary://123456789012345:abcdefghijklmnopqrstuvwxyz12@demo"


class CloudinaryUploadHelperTests(SimpleTestCase):
    @override_settings()
    def test_sign_upload_includes_folder_and_signature(self):
        with mock.patch.dict(os.environ, {"CLOUDINARY_URL": _CLOUDINARY_URL}, clear=False):
            payload = sign_upload(resource_type="image")
        self.assertTrue(payload["direct_upload"])
        self.assertEqual(payload["cloud_name"], "demo")
        self.assertEqual(payload["folder"], "posts")
        self.assertEqual(payload["resource_type"], "image")
        expected = hashlib.sha1(
            f"folder=posts&timestamp={payload['timestamp']}abcdefghijklmnopqrstuvwxyz12".encode()
        ).hexdigest()
        self.assertEqual(payload["signature"], expected)

    def test_public_id_from_url(self):
        with mock.patch.dict(os.environ, {"CLOUDINARY_URL": _CLOUDINARY_URL}, clear=False):
            pid = public_id_from_cloudinary_url(
                "https://res.cloudinary.com/demo/image/upload/v1710000000/posts/abc123.jpg"
            )
        self.assertEqual(pid, "posts/abc123")

    def test_normalize_rejects_foreign_folder(self):
        with mock.patch.dict(os.environ, {"CLOUDINARY_URL": _CLOUDINARY_URL}, clear=False):
            self.assertIsNone(normalize_remote_media_ref("avatars/someone", expect_video=False))
            self.assertEqual(
                normalize_remote_media_ref("posts/ok-slide", expect_video=False),
                "posts/ok-slide",
            )
            self.assertEqual(
                normalize_remote_media_ref("posts/videos/clip1", expect_video=True),
                "posts/videos/clip1",
            )


class AbsoluteMediaUrlTests(SimpleTestCase):
    def test_keeps_cloudinary_https_urls(self):
        from config.cloudinary_media import absolute_media_url

        url = "https://res.cloudinary.com/demo/image/upload/v1/posts/x"
        self.assertEqual(absolute_media_url(None, url), url)

    def test_absolutizes_relative_media_paths(self):
        from config.cloudinary_media import absolute_media_url
        from django.test import RequestFactory

        request = RequestFactory().get("/")
        self.assertEqual(
            absolute_media_url(request, "/media/posts/x.jpg"),
            "http://testserver/media/posts/x.jpg",
        )


class CloudinaryVideoDeliveryTrimTests(SimpleTestCase):
    def test_inserts_trim_on_plain_url(self):
        url = "https://res.cloudinary.com/demo/video/upload/v1/media/posts/videos/clip"
        out = cloudinary_video_delivery_url(url, 1.5, 8.0)
        self.assertIn("so_1.50", out)
        self.assertIn("eo_8.00", out)
        self.assertIn("f_auto,q_auto", out)

    def test_merges_trim_into_existing_f_auto(self):
        url = "https://res.cloudinary.com/demo/video/upload/f_auto,q_auto/v1/media/clip"
        out = cloudinary_video_delivery_url(url, 2.0, 9.0)
        self.assertIn("so_2.00", out)
        self.assertIn("eo_9.00", out)
        self.assertIn("f_auto,q_auto", out)


class MediaSignApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="uploader", email="uploader@test.local", password="pass12345"
        )

    def test_requires_auth(self):
        res = self.client.post("/api/social/media/sign/", {"resource_type": "image"}, format="json")
        self.assertEqual(res.status_code, 401)

    def test_returns_disabled_when_cloudinary_missing(self):
        self.client.force_authenticate(user=self.user)
        with mock.patch.dict(os.environ, {"CLOUDINARY_URL": ""}, clear=False):
            res = self.client.post(
                "/api/social/media/sign/", {"resource_type": "image"}, format="json"
            )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["direct_upload"])

    def test_returns_signature_when_configured(self):
        self.client.force_authenticate(user=self.user)
        with mock.patch.dict(os.environ, {"CLOUDINARY_URL": _CLOUDINARY_URL}, clear=False):
            res = self.client.post(
                "/api/social/media/sign/", {"resource_type": "video"}, format="json"
            )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["direct_upload"])
        self.assertEqual(res.data["resource_type"], "video")
        self.assertEqual(res.data["folder"], "posts/videos")
        self.assertIn("signature", res.data)


class PostCreateWithRemoteMediaTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="poster", email="poster@test.local", password="pass12345"
        )
        self.client.force_authenticate(user=self.user)

    def test_create_post_with_image_public_id(self):
        with mock.patch.dict(os.environ, {"CLOUDINARY_URL": _CLOUDINARY_URL}, clear=False):
            res = self.client.post(
                "/api/social/posts/",
                {
                    "body": "Direct upload post",
                    "region": "Khomas",
                    "is_delvers": True,
                    "image_public_id": "posts/demo-slide",
                },
                format="multipart",
            )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["body"], "Direct upload post")
        from social.models import Post

        post = Post.objects.get(pk=res.data["id"])
        self.assertEqual(post.image.name, "posts/demo-slide")
        image_url = res.data.get("image") or ""
        self.assertIn("res.cloudinary.com", image_url)
        self.assertIn("/image/upload/", image_url)
        # Must address the real public_id (posts/…), not media/posts/…
        self.assertIn("/posts/demo-slide", image_url)
        self.assertNotIn("/media/posts/demo-slide", image_url)
