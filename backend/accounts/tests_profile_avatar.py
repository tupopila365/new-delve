import base64

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient, APITestCase

User = get_user_model()

_TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


class ProfileAvatarUpdateTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="avatar_user",
            email="avatar_user@test.local",
            password="pass12345",
        )
        self.client.force_authenticate(user=self.user)

    def test_can_upload_avatar(self):
        upload = SimpleUploadedFile("avatar.png", _TINY_PNG, content_type="image/png")
        res = self.client.patch(
            "/api/accounts/me/update/",
            {"avatar": upload},
            format="multipart",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.user.profile.refresh_from_db()
        self.assertTrue(bool(self.user.profile.avatar))

    def test_can_clear_avatar_with_json_null(self):
        upload = SimpleUploadedFile("avatar.png", _TINY_PNG, content_type="image/png")
        self.client.patch(
            "/api/accounts/me/update/",
            {"avatar": upload},
            format="multipart",
        )
        self.user.profile.refresh_from_db()
        self.assertTrue(bool(self.user.profile.avatar))

        res = self.client.patch(
            "/api/accounts/me/update/",
            {"avatar": None},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.user.profile.refresh_from_db()
        self.assertFalse(bool(self.user.profile.avatar))
