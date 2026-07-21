from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.views import ChangePasswordView, PasswordResetRequestView

User = get_user_model()


class ChangePasswordTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._orig_throttles = ChangePasswordView.throttle_classes
        ChangePasswordView.throttle_classes = []

    @classmethod
    def tearDownClass(cls):
        ChangePasswordView.throttle_classes = cls._orig_throttles
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="pwd_user", email="pwd@test.local", password="OldPass123!"
        )
        self.client.force_authenticate(user=self.user)

    def test_change_password_success_returns_tokens(self):
        res = self.client.post(
            "/api/accounts/me/change-password/",
            {"current_password": "OldPass123!", "new_password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["detail"], "Password updated.")
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass456!"))
        self.assertFalse(self.user.check_password("OldPass123!"))

    def test_change_password_rejects_wrong_current(self):
        res = self.client.post(
            "/api/accounts/me/change-password/",
            {"current_password": "WrongPass!", "new_password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["detail"], "Current password is incorrect.")

    def test_change_password_rejects_same_password(self):
        res = self.client.post(
            "/api/accounts/me/change-password/",
            {"current_password": "OldPass123!", "new_password": "OldPass123!"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("different", res.data["detail"].lower())

    def test_change_password_requires_auth(self):
        self.client.force_authenticate(user=None)
        res = self.client.post(
            "/api/accounts/me/change-password/",
            {"current_password": "OldPass123!", "new_password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(res.status_code, 401)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="http://localhost:5173",
    CORS_ALLOWED_ORIGINS=["https://app.example.com", "http://localhost:5173"],
)
class PasswordResetFrontendUrlFallbackTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._orig_throttles = PasswordResetRequestView.throttle_classes
        PasswordResetRequestView.throttle_classes = []

    @classmethod
    def tearDownClass(cls):
        PasswordResetRequestView.throttle_classes = cls._orig_throttles
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="origin_user", email="origin@test.local", password="OldPass123!"
        )

    def test_reset_email_uses_origin_when_frontend_url_is_localhost(self):
        res = self.client.post(
            "/api/accounts/password-reset/request/",
            {"email": self.user.email},
            format="json",
            HTTP_ORIGIN="https://app.example.com",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("https://app.example.com/reset-password?token=", mail.outbox[0].body)
        self.assertNotIn("localhost:5173", mail.outbox[0].body)
