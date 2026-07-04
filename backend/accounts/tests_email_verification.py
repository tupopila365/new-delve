from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import EmailVerificationToken, Profile
from accounts.views import ResendVerificationView, VerifyEmailView

User = get_user_model()

_EMAIL_TEST_SETTINGS = {
    "EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend",
}


@override_settings(**_EMAIL_TEST_SETTINGS)
class EmailVerificationFlowTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._verify_throttles = VerifyEmailView.throttle_classes
        cls._resend_throttles = ResendVerificationView.throttle_classes
        VerifyEmailView.throttle_classes = []
        ResendVerificationView.throttle_classes = []

    @classmethod
    def tearDownClass(cls):
        VerifyEmailView.throttle_classes = cls._verify_throttles
        ResendVerificationView.throttle_classes = cls._resend_throttles
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="verify_flow",
            email="verify-flow@test.local",
            password="Pass12345!",
        )
        Profile.objects.filter(user=self.user).update(email_verified=False)
        self.token = EmailVerificationToken.create_for_user(self.user)

    def test_verify_marks_profile_and_returns_jwt(self):
        res = self.client.post(
            "/api/accounts/verify-email/",
            {"token": str(self.token.token)},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.user.profile.refresh_from_db()
        self.assertTrue(self.user.profile.email_verified)

    def test_resend_authenticated_sends_email(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/api/accounts/resend-verification/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["detail"], "Verification email sent.")
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_authenticated_skips_verified(self):
        Profile.objects.filter(user=self.user).update(email_verified=True)
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/api/accounts/resend-verification/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["detail"], "Email is already verified.")
        self.assertEqual(len(mail.outbox), 0)

    def test_resend_anonymous_uses_generic_message(self):
        res = self.client.post(
            "/api/accounts/resend-verification/",
            {"email": self.user.email},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("unverified", res.data["detail"])
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_anonymous_unknown_email_same_message(self):
        res = self.client.post(
            "/api/accounts/resend-verification/",
            {"email": "nobody@test.local"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("unverified", res.data["detail"])
        self.assertEqual(len(mail.outbox), 0)
