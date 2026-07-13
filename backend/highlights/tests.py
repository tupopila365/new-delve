from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient, APITestCase

User = get_user_model()

MINIMAL_JPEG = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa\x07\"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n\x16\x17\x18\x19\x1a%&'()*456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfe\xff\xd9"
)


class HighlightMediaUploadTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="highlight_uploader",
            email="hl@test.local",
            password="pass12345",
        )

    def test_requires_auth(self):
        res = self.client.post("/api/highlights/upload/", {})
        self.assertEqual(res.status_code, 401)

    def test_upload_image_returns_url(self):
        image = SimpleUploadedFile("slide.jpg", MINIMAL_JPEG, content_type="image/jpeg")
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/api/highlights/upload/", {"file": image}, format="multipart")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["kind"], "image")
        self.assertTrue(res.data["url"])

    def test_upload_video_returns_url(self):
        video = SimpleUploadedFile("clip.mp4", b"\x00\x00\x00\x18ftypmp42", content_type="video/mp4")
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/api/highlights/upload/", {"file": video}, format="multipart")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["kind"], "video")
        self.assertTrue(res.data["url"])

    def test_upload_video_accepts_trim_offsets(self):
        video = SimpleUploadedFile("clip.mp4", b"\x00\x00\x00\x18ftypmp42", content_type="video/mp4")
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/highlights/upload/",
            {"file": video, "trim_start": "1.0", "trim_end": "5.0"},
            format="multipart",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["kind"], "video")
        self.assertTrue(res.data["url"])

    def test_rejects_trim_on_image(self):
        image = SimpleUploadedFile("slide.jpg", MINIMAL_JPEG, content_type="image/jpeg")
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/highlights/upload/",
            {"file": image, "trim_start": "0", "trim_end": "2"},
            format="multipart",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("file", res.data)

    def test_rejects_color_grade_on_image(self):
        image = SimpleUploadedFile("slide.jpg", MINIMAL_JPEG, content_type="image/jpeg")
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/highlights/upload/",
            {"file": image, "grade_saturation": "1.5"},
            format="multipart",
        )
        self.assertEqual(res.status_code, 400)

    def test_video_with_grade_uploads(self):
        # Fake mp4 can't actually be re-encoded; bake fails gracefully and the
        # original upload is returned, so the request still succeeds.
        video = SimpleUploadedFile("clip.mp4", b"\x00\x00\x00\x18ftypmp42", content_type="video/mp4")
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/highlights/upload/",
            {"file": video, "grade_saturation": "1.4", "grade_brightness": "1.1"},
            format="multipart",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["kind"], "video")
        self.assertTrue(res.data["url"])


class VideoEffectsHelperTests(APITestCase):
    def test_neutral_grade_is_none(self):
        from social.video_effects import parse_color_grade

        data = {"grade_brightness": "1.0", "grade_contrast": "1.0", "grade_saturation": "1.0"}
        self.assertIsNone(parse_color_grade(data))

    def test_meaningful_grade_parsed(self):
        from social.video_effects import parse_color_grade

        grade = parse_color_grade({"grade_saturation": "1.5"})
        self.assertIsNotNone(grade)
        self.assertAlmostEqual(grade["saturation"], 1.5)

    def test_filtergraph_includes_eq_and_sepia(self):
        from social.video_effects import build_grade_filtergraph

        graph = build_grade_filtergraph(
            {"brightness": 1.1, "contrast": 1.2, "saturation": 1.3, "sepia": 0.4, "sharpen": 0.5}
        )
        self.assertIn("eq=", graph)
        self.assertIn("colorchannelmixer=", graph)
        self.assertIn("unsharp=", graph)

    def test_prefixed_grade_for_carousel_slides(self):
        from social.video_effects import parse_color_grade

        grade = parse_color_grade({"slide2_grade_contrast": "1.4"}, prefix="slide2_")
        self.assertIsNotNone(grade)
        self.assertAlmostEqual(grade["contrast"], 1.4)
