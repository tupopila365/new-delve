from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from unittest import mock
import os

from social.models import Post, ProcessingStatus
from social.video_bake_jobs import aggregate_processing_status, queue_deferred_bake

User = get_user_model()


class DeferredBakeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="baker", email="baker@test.local", password="pass12345"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_queue_marks_processing_and_stores_grade(self):
        post = Post.objects.create(
            author=self.user,
            body="clip",
            video=SimpleUploadedFile("clip.mp4", b"fake-video-bytes", content_type="video/mp4"),
        )
        grade = {"brightness": 1.1, "contrast": 1.0, "saturation": 1.2}
        changed = queue_deferred_bake(
            post,
            trim=(1.0, 5.0),
            grade=grade,
            overlay_bytes=b"\x89PNG\r\n\x1a\n",
        )
        post.save(update_fields=changed)
        post.refresh_from_db()
        self.assertEqual(post.processing_status, ProcessingStatus.PROCESSING)
        self.assertEqual(post.edit_grade["saturation"], 1.2)
        self.assertEqual(post.video_trim_start, 1.0)
        self.assertTrue(bool(post.overlay))
        self.assertEqual(aggregate_processing_status(post), ProcessingStatus.PROCESSING)

    @override_settings(MEDIA_ROOT="/tmp/delve-test-media")
    def test_create_with_grade_returns_processing_without_sync_bake(self):
        video = SimpleUploadedFile("clip.mp4", b"\x00\x00\x00\x18ftypmp42", content_type="video/mp4")
        with mock.patch("social.video_bake_jobs.schedule_bake") as schedule_mock:
            with mock.patch("social.video_bake_jobs.bake_video_field") as bake_mock:
                res = self.client.post(
                    "/api/social/posts/",
                    {
                        "body": "Filtered clip",
                        "region": "Windhoek",
                        "is_delvers": "true",
                        "video": video,
                        "grade_saturation": "1.4",
                        "grade_brightness": "1.0",
                        "grade_contrast": "1.0",
                    },
                    format="multipart",
                )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data.get("processing_status"), ProcessingStatus.PROCESSING)
        bake_mock.assert_not_called()
        post = Post.objects.get(pk=res.data["id"])
        self.assertEqual(post.processing_status, ProcessingStatus.PROCESSING)
        self.assertIsNotNone(post.edit_grade)
        schedule_mock.assert_called()

    @override_settings(MEDIA_ROOT="/tmp/delve-test-media")
    def test_grade_delivery_skips_bake_when_flag_on(self):
        env = {
            "CLOUDINARY_URL": "cloudinary://123456789012345:abcdefghijklmnopqrstuvwxyz12@demo",
            "DELVERS_CLOUDINARY_GRADE_DELIVERY": "1",
        }
        with mock.patch.dict(os.environ, env, clear=False):
            with mock.patch("social.video_bake_jobs.schedule_bake") as schedule_mock:
                res = self.client.post(
                    "/api/social/posts/",
                    {
                        "body": "CDN grade",
                        "region": "Windhoek",
                        "is_delvers": "true",
                        "video_public_id": "posts/videos/cdn-grade-clip",
                        "grade_saturation": "1.4",
                    },
                    format="multipart",
                )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data.get("processing_status"), ProcessingStatus.READY)
        schedule_mock.assert_not_called()
        post = Post.objects.get(pk=res.data["id"])
        self.assertEqual(post.processing_status, ProcessingStatus.READY)
        self.assertIsNotNone(post.edit_grade)
