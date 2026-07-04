from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import PasswordResetToken
from accounts.views import PASSWORD_RESET_SENT_MESSAGE, PasswordResetConfirmView, PasswordResetRequestView

User = get_user_model()

_RESET_TEST_SETTINGS = {
    "EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend",
}


@override_settings(**_RESET_TEST_SETTINGS)
class PasswordResetRequestTests(TestCase):
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
            username="reset_user", email="reset@test.local", password="OldPass123!"
        )

    def test_request_returns_generic_message_for_unknown_email(self):
        res = self.client.post(
            "/api/accounts/password-reset/request/",
            {"email": "nobody@test.local"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["detail"], PASSWORD_RESET_SENT_MESSAGE)
        self.assertEqual(len(mail.outbox), 0)

    def test_request_sends_email_for_valid_user(self):
        res = self.client.post(
            "/api/accounts/password-reset/request/",
            {"email": self.user.email},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["detail"], PASSWORD_RESET_SENT_MESSAGE)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("reset-password", mail.outbox[0].body)
        self.assertTrue(PasswordResetToken.objects.filter(user=self.user, used=False).exists())

    def test_request_same_response_for_known_email(self):
        res = self.client.post(
            "/api/accounts/password-reset/request/",
            {"email": self.user.email},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["detail"], PASSWORD_RESET_SENT_MESSAGE)

    def test_request_does_not_send_for_staff(self):
        staff = User.objects.create_user(
            username="staff_user", email="staff@test.local", password="OldPass123!", is_staff=True
        )
        res = self.client.post(
            "/api/accounts/password-reset/request/",
            {"email": staff.email},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["detail"], PASSWORD_RESET_SENT_MESSAGE)
        self.assertEqual(len(mail.outbox), 0)

    def test_request_does_not_send_for_deleted_tombstone(self):
        self.user.username = f"deleted_{self.user.pk}"
        self.user.save(update_fields=["username"])
        res = self.client.post(
            "/api/accounts/password-reset/request/",
            {"email": self.user.email},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_request_requires_email(self):
        res = self.client.post("/api/accounts/password-reset/request/", {}, format="json")
        self.assertEqual(res.status_code, 400)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class PasswordResetConfirmTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._orig_throttles = PasswordResetConfirmView.throttle_classes
        PasswordResetConfirmView.throttle_classes = []

    @classmethod
    def tearDownClass(cls):
        PasswordResetConfirmView.throttle_classes = cls._orig_throttles
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="confirm_user", email="confirm@test.local", password="OldPass123!"
        )
        self.token = PasswordResetToken.create_for_user(self.user)

    def test_confirm_updates_password(self):
        res = self.client.post(
            "/api/accounts/password-reset/confirm/",
            {"token": str(self.token.token), "new_password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass456!"))
        self.token.refresh_from_db()
        self.assertTrue(self.token.used)

    def test_confirm_rejects_expired_token(self):
        PasswordResetToken.objects.filter(pk=self.token.pk).update(
            created_at=timezone.now() - timezone.timedelta(hours=2)
        )
        res = self.client.post(
            "/api/accounts/password-reset/confirm/",
            {"token": str(self.token.token), "new_password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPass123!"))

    def test_confirm_rejects_used_token(self):
        self.token.used = True
        self.token.save(update_fields=["used"])
        res = self.client.post(
            "/api/accounts/password-reset/confirm/",
            {"token": str(self.token.token), "new_password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_confirm_rejects_invalid_token(self):
        res = self.client.post(
            "/api/accounts/password-reset/confirm/",
            {"token": "not-a-uuid", "new_password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_old_password_fails_after_reset(self):
        self.client.post(
            "/api/accounts/password-reset/confirm/",
            {"token": str(self.token.token), "new_password": "NewPass456!"},
            format="json",
        )
        login_res = self.client.post(
            "/api/accounts/token/",
            {"email": self.user.email, "password": "OldPass123!"},
            format="json",
        )
        self.assertIn(login_res.status_code, (400, 401))
        login_res = self.client.post(
            "/api/accounts/token/",
            {"email": self.user.email, "password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(login_res.status_code, 200)
