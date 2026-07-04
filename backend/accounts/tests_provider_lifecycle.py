"""Phase 4 — provider lifecycle upgrade tests."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import BusinessProfile, Profile, UserType

User = get_user_model()


class BecomeProviderTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.traveler = User.objects.create_user(
            username="upgrade_me", email="upgrade@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.traveler).update(user_type=UserType.NORMAL)

    def test_traveler_can_become_provider(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post("/api/accounts/me/become-provider/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["user_type"], UserType.SERVICE_PROVIDER)
        self.traveler.profile.refresh_from_db()
        self.assertEqual(self.traveler.profile.user_type, UserType.SERVICE_PROVIDER)

    def test_already_provider_returns_400(self):
        Profile.objects.filter(user=self.traveler).update(user_type=UserType.SERVICE_PROVIDER)
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post("/api/accounts/me/become-provider/", {}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_profile_update_cannot_set_user_type(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.patch(
            "/api/accounts/me/update/",
            {"user_type": "service_provider"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.traveler.profile.refresh_from_db()
        self.assertEqual(self.traveler.profile.user_type, UserType.NORMAL)

    def test_become_provider_then_create_business(self):
        self.client.force_authenticate(user=self.traveler)
        upgrade = self.client.post("/api/accounts/me/become-provider/", {}, format="json")
        self.assertEqual(upgrade.status_code, 200)
        create = self.client.post(
            "/api/accounts/me/businesses/create/",
            {
                "business_name": "Upgrade Stays",
                "business_types": ["accommodation"],
                "region": "Khomas",
                "city": "Windhoek",
            },
            format="json",
        )
        self.assertEqual(create.status_code, 201)
        self.assertFalse(create.data["onboarding_completed"])
        self.assertEqual(create.data["verification_status"], "unverified")
        self.assertTrue(BusinessProfile.objects.filter(owner=self.traveler).exists())
