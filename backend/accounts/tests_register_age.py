"""Registration requires birth year (18+). Account is pending until email verify."""

from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.age_gate import MIN_ACCOUNT_AGE, max_birth_year_for_min_age
from accounts.models import PendingRegistration
from accounts.views import RegisterView

User = get_user_model()

_EMAIL_TEST_SETTINGS = {
    "EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend",
}


@override_settings(**_EMAIL_TEST_SETTINGS)
class RegisterAgeGateTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._orig_throttles = RegisterView.throttle_classes
        RegisterView.throttle_classes = []

    @classmethod
    def tearDownClass(cls):
        RegisterView.throttle_classes = cls._orig_throttles
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        self.adult_year = max_birth_year_for_min_age()
        self.underage_year = self.adult_year + 1

    def _payload(self, **overrides):
        data = {
            "username": "new_traveller",
            "email": "new@test.local",
            "password": "Pass12345!",
            "birth_year": self.adult_year,
            "user_type": "normal",
        }
        data.update(overrides)
        return data

    def test_register_requires_birth_year(self):
        payload = self._payload()
        del payload["birth_year"]
        res = self.client.post("/api/accounts/register/", payload, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("birth_year", res.data)

    def test_register_rejects_underage(self):
        res = self.client.post(
            "/api/accounts/register/",
            self._payload(birth_year=self.underage_year),
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("birth_year", res.data)
        self.assertIn(str(MIN_ACCOUNT_AGE), str(res.data["birth_year"]))

    def test_register_accepts_adult_and_saves_pending_not_user(self):
        res = self.client.post("/api/accounts/register/", self._payload(), format="json")
        self.assertEqual(res.status_code, 201)
        self.assertFalse(User.objects.filter(username="new_traveller").exists())
        pending = PendingRegistration.objects.get(email="new@test.local")
        self.assertEqual(pending.username, "new_traveller")
        self.assertEqual(pending.birth_year, self.adult_year)

    def test_register_rejects_future_year(self):
        res = self.client.post(
            "/api/accounts/register/",
            self._payload(birth_year=date.today().year + 1),
            format="json",
        )
        self.assertEqual(res.status_code, 400)
