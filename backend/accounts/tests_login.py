from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.views import ThrottledTokenView

User = get_user_model()


class TokenObtainPairTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._orig_throttles = ThrottledTokenView.throttle_classes
        ThrottledTokenView.throttle_classes = []

    @classmethod
    def tearDownClass(cls):
        ThrottledTokenView.throttle_classes = cls._orig_throttles
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="login_user",
            email="login@test.local",
            password="Pass12345!",
        )

    def test_login_with_email(self):
        res = self.client.post(
            "/api/accounts/token/",
            {"email": self.user.email, "password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_login_with_username(self):
        res = self.client.post(
            "/api/accounts/token/",
            {"username": self.user.username, "password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)

    def test_login_rejects_both_email_and_username(self):
        res = self.client.post(
            "/api/accounts/token/",
            {
                "email": self.user.email,
                "username": self.user.username,
                "password": "Pass12345!",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_login_rejects_neither_email_nor_username(self):
        res = self.client.post(
            "/api/accounts/token/",
            {"password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_login_rejects_wrong_password(self):
        res = self.client.post(
            "/api/accounts/token/",
            {"email": self.user.email, "password": "wrong"},
            format="json",
        )
        self.assertIn(res.status_code, (400, 401))

    def test_login_email_is_case_insensitive(self):
        res = self.client.post(
            "/api/accounts/token/",
            {"email": "LOGIN@TEST.LOCAL", "password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
