"""Cross-cutting smoke tests for Phases 8–11 (create policy, reset, self-delete)."""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import PasswordResetToken, Profile
from accounts.views import PasswordResetRequestView, SelfDeleteAccountView
from social.models import Post

User = get_user_model()

_SMOKE_SETTINGS = {
    "EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend",
    "REST_FRAMEWORK": {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_CLASSES": [],
    },
}


@override_settings(**_SMOKE_SETTINGS)
class DeferredFeaturesSmokeTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._orig_reset_throttles = PasswordResetRequestView.throttle_classes
        cls._orig_delete_throttles = SelfDeleteAccountView.throttle_classes
        PasswordResetRequestView.throttle_classes = []
        SelfDeleteAccountView.throttle_classes = []

    @classmethod
    def tearDownClass(cls):
        PasswordResetRequestView.throttle_classes = cls._orig_reset_throttles
        SelfDeleteAccountView.throttle_classes = cls._orig_delete_throttles
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()

    def test_password_reset_round_trip(self):
        user = User.objects.create_user(
            username="smoke_reset", email="reset@smoke.local", password="OldPass123!"
        )
        req = self.client.post(
            "/api/accounts/password-reset/request/",
            {"email": user.email},
            format="json",
        )
        self.assertEqual(req.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)

        token = PasswordResetToken.objects.get(user=user, used=False)
        confirm = self.client.post(
            "/api/accounts/password-reset/confirm/",
            {"token": str(token.token), "new_password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(confirm.status_code, 200)

        old_login = self.client.post(
            "/api/accounts/token/",
            {"email": user.email, "password": "OldPass123!"},
            format="json",
        )
        self.assertIn(old_login.status_code, (400, 401))

        new_login = self.client.post(
            "/api/accounts/token/",
            {"email": user.email, "password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(new_login.status_code, 200)
        self.assertIn("access", new_login.data)

    def test_self_delete_hides_user_from_search(self):
        user = User.objects.create_user(
            username="smoke_delete", email="delete@smoke.local", password="Pass12345!"
        )
        Profile.objects.filter(user=user).update(
            display_name="Smoke Delete Me",
            show_in_search=True,
            region="Khomas",
        )
        Post.objects.create(author=user, body="Smoke delete post", is_delvers=True)

        before = self.client.get("/api/search/?q=Smoke")
        self.assertEqual(before.status_code, 200)
        self.assertIn("smoke_delete", [u["username"] for u in before.data["users"]])

        self.client.force_authenticate(user=user)
        deleted = self.client.post(
            "/api/accounts/me/delete/",
            {"confirm_username": "smoke_delete", "current_password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(deleted.status_code, 200)

        self.client.force_authenticate(user=None)
        after = self.client.get("/api/search/?q=Smoke")
        self.assertEqual(after.status_code, 200)
        self.assertNotIn("smoke_delete", [u["username"] for u in after.data["users"]])

        profile = self.client.get("/api/accounts/users/smoke_delete/")
        self.assertEqual(profile.status_code, 404)

    def test_post_create_rejects_user_audio_upload(self):
        from io import BytesIO

        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        user = User.objects.create_user(
            username="smoke_poster", email="poster@smoke.local", password="pass12345"
        )
        self.client.force_authenticate(user=user)

        buf = BytesIO()
        Image.new("RGB", (2, 2), color="blue").save(buf, format="PNG")
        image = SimpleUploadedFile("photo.png", buf.getvalue(), content_type="image/png")
        audio = SimpleUploadedFile("track.mp3", b"fake-mp3", content_type="audio/mpeg")

        ok = self.client.post(
            "/api/social/posts/",
            {"body": "Photo only", "region": "Khomas", "is_delvers": False, "image": image},
            format="multipart",
        )
        self.assertEqual(ok.status_code, 201)

        bad = self.client.post(
            "/api/social/posts/",
            {
                "body": "With audio",
                "region": "Khomas",
                "is_delvers": False,
                "music": audio,
            },
            format="multipart",
        )
        self.assertEqual(bad.status_code, 400)
        self.assertIn("Audio uploads are not allowed", str(bad.data))
