from django.test import SimpleTestCase, override_settings
from unittest import mock
import os

from config.cloudinary_media import (
    build_grade_transform_parts,
    cloudinary_video_delivery_url,
    grade_delivery_enabled,
)
from config.cloudinary_upload import sign_upload


class GradeDeliveryTransformTests(SimpleTestCase):
    def test_build_grade_parts_for_saturation(self):
        parts = build_grade_transform_parts({"saturation": 1.4, "brightness": 1.0})
        self.assertTrue(any(p.startswith("e_saturation:") for p in parts))
        self.assertFalse(any(p.startswith("e_brightness:") for p in parts))

    def test_grade_delivery_flag(self):
        with mock.patch.dict(os.environ, {"DELVERS_CLOUDINARY_GRADE_DELIVERY": "1"}, clear=False):
            self.assertTrue(grade_delivery_enabled())
        with mock.patch.dict(os.environ, {"DELVERS_CLOUDINARY_GRADE_DELIVERY": "0"}, clear=False):
            self.assertFalse(grade_delivery_enabled())

    def test_delivery_url_includes_grade_when_enabled(self):
        url = "https://res.cloudinary.com/demo/video/upload/v1/posts/videos/clip"
        with mock.patch.dict(os.environ, {"DELVERS_CLOUDINARY_GRADE_DELIVERY": "1"}, clear=False):
            out = cloudinary_video_delivery_url(
                url, trim_start=1.0, trim_end=8.0, grade={"saturation": 1.5}
            )
        self.assertIn("so_1.00", out)
        self.assertIn("eo_8.00", out)
        self.assertIn("e_saturation:", out)
        self.assertIn("f_auto,q_auto", out)


class SignUploadChunkConfigTests(SimpleTestCase):
    def test_sign_includes_chunk_thresholds(self):
        with mock.patch.dict(
            os.environ,
            {"CLOUDINARY_URL": "cloudinary://123456789012345:abcdefghijklmnopqrstuvwxyz12@demo"},
            clear=False,
        ):
            payload = sign_upload(resource_type="video")
        self.assertTrue(payload["direct_upload"])
        self.assertEqual(payload["chunk_threshold_bytes"], 10 * 1024 * 1024)
        self.assertEqual(payload["chunk_size_bytes"], 6 * 1024 * 1024)
