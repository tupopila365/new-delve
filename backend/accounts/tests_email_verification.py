from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import EmailVerificationToken, PendingRegistration, Profile
from accounts.views import RegisterView, ResendVerificationView, VerifyEmailView

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
        cls._register_throttles = RegisterView.throttle_classes
        VerifyEmailView.throttle_classes = []
        ResendVerificationView.throttle_classes = []
        RegisterView.throttle_classes = []

    @classmethod
    def tearDownClass(cls):
        VerifyEmailView.throttle_classes = cls._verify_throttles
        ResendVerificationView.throttle_classes = cls._resend_throttles
        RegisterView.throttle_classes = cls._register_throttles
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        # Legacy unverified user (already in DB) — still supports verify + resend.
        self.user = User.objects.create_user(
            username="verify_flow",
            email="verify-flow@test.local",
            password="Pass12345!",
        )
        Profile.objects.filter(user=self.user).update(email_verified=False, display_name="")
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
        self.assertEqual(self.user.profile.display_name, "verify_flow")

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

    @override_settings(FRONTEND_URL="https://app.example.com")
    def test_verification_email_uses_frontend_url(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/api/accounts/resend-verification/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body
        self.assertIn("https://app.example.com/verify-email?token=", body)
        self.assertEqual(mail.outbox[0].subject, "Verify your DELVE account")
        html_parts = [p for p in mail.outbox[0].alternatives if p[1] == "text/html"]
        self.assertEqual(len(html_parts), 1)
        self.assertIn("Verify your email", html_parts[0][0])
        self.assertIn("https://app.example.com/verify-email?token=", html_parts[0][0])

    def test_unverified_user_cannot_login(self):
        res = self.client.post(
            "/api/accounts/token/",
            {"email": self.user.email, "password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Verify your email", str(res.data))

    def test_staff_can_login_without_email_verified(self):
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        res = self.client.post(
            "/api/accounts/token/",
            {"email": self.user.email, "password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)

    def test_pending_register_verify_creates_user_with_name(self):
        res = self.client.post(
            "/api/accounts/register/",
            {
                "username": "pending_user",
                "email": "pending@test.local",
                "password": "Pass12345!",
                "birth_year": 1995,
                "user_type": "normal",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertFalse(User.objects.filter(username="pending_user").exists())
        pending = PendingRegistration.objects.get(email="pending@test.local")
        self.assertEqual(len(mail.outbox), 1)

        verify = self.client.post(
            "/api/accounts/verify-email/",
            {"token": str(pending.token)},
            format="json",
        )
        self.assertEqual(verify.status_code, 200)
        self.assertIn("access", verify.data)
        self.assertFalse(PendingRegistration.objects.filter(email="pending@test.local").exists())
        user = User.objects.get(username="pending_user")
        self.assertTrue(user.profile.email_verified)
        self.assertEqual(user.profile.display_name, "pending_user")
        self.assertEqual(user.profile.birth_year, 1995)

    def test_pending_cannot_login_before_verify(self):
        self.client.post(
            "/api/accounts/register/",
            {
                "username": "pending_login",
                "email": "pending-login@test.local",
                "password": "Pass12345!",
                "birth_year": 1995,
                "user_type": "normal",
            },
            format="json",
        )
        res = self.client.post(
            "/api/accounts/token/",
            {"email": "pending-login@test.local", "password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Verify your email", str(res.data))

    def test_resend_pending_sends_email(self):
        self.client.post(
            "/api/accounts/register/",
            {
                "username": "pending_resend",
                "email": "pending-resend@test.local",
                "password": "Pass12345!",
                "birth_year": 1995,
                "user_type": "normal",
            },
            format="json",
        )
        mail.outbox.clear()
        res = self.client.post(
            "/api/accounts/resend-verification/",
            {"email": "pending-resend@test.local"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("unverified", res.data["detail"])
        self.assertEqual(len(mail.outbox), 1)
