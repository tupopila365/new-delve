from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import AdminAuditLog, Profile
from accounts.views import SelfDeleteAccountView
from social.models import Post

User = get_user_model()

_SELF_DELETE_TEST_SETTINGS = {
    "REST_FRAMEWORK": {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_CLASSES": [],
    },
}


@override_settings(**_SELF_DELETE_TEST_SETTINGS)
class SelfDeleteAccountTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._orig_throttles = SelfDeleteAccountView.throttle_classes
        SelfDeleteAccountView.throttle_classes = []

    @classmethod
    def tearDownClass(cls):
        SelfDeleteAccountView.throttle_classes = cls._orig_throttles
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="delete_me", email="delete@test.local", password="Pass12345!"
        )
        Profile.objects.filter(user=self.user).update(display_name="Delete Me", show_in_search=True)
        self.post = Post.objects.create(author=self.user, body="My post", is_delvers=True)
        self.client.force_authenticate(user=self.user)

    def test_self_delete_anonymizes_account(self):
        res = self.client.post(
            "/api/accounts/me/delete/",
            {"confirm_username": "delete_me", "current_password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, f"deleted_{self.user.pk}")
        self.assertFalse(self.user.is_active)
        self.assertFalse(self.user.check_password("Pass12345!"))
        profile = self.user.profile
        self.assertFalse(profile.show_in_search)
        self.assertTrue(profile.is_private)
        self.assertEqual(profile.display_name, "Deleted user")

    def test_self_delete_hides_posts(self):
        self.client.post(
            "/api/accounts/me/delete/",
            {"confirm_username": "delete_me", "current_password": "Pass12345!"},
            format="json",
        )
        self.post.refresh_from_db()
        self.assertTrue(self.post.is_hidden)

    def test_self_delete_creates_audit_log(self):
        self.client.post(
            "/api/accounts/me/delete/",
            {"confirm_username": "delete_me", "current_password": "Pass12345!"},
            format="json",
        )
        self.assertTrue(
            AdminAuditLog.objects.filter(
                action="user_self_delete",
                target_type="user",
                target_id=str(self.user.pk),
            ).exists()
        )

    def test_self_delete_wrong_password(self):
        res = self.client.post(
            "/api/accounts/me/delete/",
            {"confirm_username": "delete_me", "current_password": "wrong"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "delete_me")

    def test_self_delete_wrong_username(self):
        res = self.client.post(
            "/api/accounts/me/delete/",
            {"confirm_username": "wrong", "current_password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_staff_cannot_self_delete(self):
        staff = User.objects.create_user(
            username="staff_del", email="staff@test.local", password="Pass12345!", is_staff=True
        )
        self.client.force_authenticate(user=staff)
        res = self.client.post(
            "/api/accounts/me/delete/",
            {"confirm_username": "staff_del", "current_password": "Pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        staff.refresh_from_db()
        self.assertEqual(staff.username, "staff_del")

    def test_cannot_login_after_self_delete(self):
        self.client.post(
            "/api/accounts/me/delete/",
            {"confirm_username": "delete_me", "current_password": "Pass12345!"},
            format="json",
        )
        self.client.force_authenticate(user=None)
        login = self.client.post(
            "/api/accounts/token/",
            {"email": "delete@test.local", "password": "Pass12345!"},
            format="json",
        )
        self.assertIn(login.status_code, (400, 401))

    def test_old_username_not_in_search(self):
        self.client.post(
            "/api/accounts/me/delete/",
            {"confirm_username": "delete_me", "current_password": "Pass12345!"},
            format="json",
        )
        search = self.client.get("/api/search/?q=Delete")
        self.assertEqual(search.status_code, 200)
        usernames = [u["username"] for u in search.data["users"]]
        self.assertNotIn("delete_me", usernames)

    def test_public_profile_gone_for_old_username(self):
        self.client.post(
            "/api/accounts/me/delete/",
            {"confirm_username": "delete_me", "current_password": "Pass12345!"},
            format="json",
        )
        self.client.force_authenticate(user=None)
        res = self.client.get("/api/accounts/users/delete_me/")
        self.assertEqual(res.status_code, 404)


class AdminDeleteSelfBlockTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin_self", email="admin@test.local", password="pass12345", is_staff=True
        )
        self.client.force_authenticate(user=self.admin)

    def test_admin_cannot_delete_own_account(self):
        res = self.client.post(
            f"/api/accounts/admin/users/{self.admin.pk}/delete/",
            {"confirm_username": "admin_self"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
