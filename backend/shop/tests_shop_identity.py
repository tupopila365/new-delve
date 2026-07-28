"""Unit tests for public shop name/avatar resolution."""

from types import SimpleNamespace

from django.test import RequestFactory, SimpleTestCase

from shop.shop_identity import shop_avatar_url, shop_display_name


def _user(*, username="seller", shop_name=None, profile_name=None, shop_avatar=None, profile_avatar=None):
    return SimpleNamespace(
        username=username,
        shop_profile=SimpleNamespace(display_name=shop_name, avatar=shop_avatar),
        profile=SimpleNamespace(display_name=profile_name, avatar=profile_avatar),
    )


class _Avatar:
    def __init__(self, url):
        self._url = url

    def __bool__(self):
        return bool(self._url)

    @property
    def url(self):
        return self._url


class _AvatarWithoutFile:
    """Truthy field whose `.url` raises, like an ImageField with a missing file."""

    @property
    def url(self):
        raise ValueError("The 'avatar' attribute has no file associated with it.")


class ShopDisplayNameTests(SimpleTestCase):
    def test_prefers_shop_display_name(self):
        user = _user(shop_name="  Desert Crafts  ", profile_name="Ana")
        self.assertEqual(shop_display_name(user), "Desert Crafts")

    def test_falls_back_to_profile_display_name(self):
        user = _user(shop_name="   ", profile_name="Ana")
        self.assertEqual(shop_display_name(user), "Ana")

    def test_falls_back_to_username(self):
        user = _user(username="ana", shop_name="", profile_name="")
        self.assertEqual(shop_display_name(user), "ana")

    def test_user_without_profiles(self):
        user = SimpleNamespace(username="ana")
        self.assertEqual(shop_display_name(user), "ana")


class ShopAvatarUrlTests(SimpleTestCase):
    def setUp(self):
        self.request = RequestFactory().get("/api/shop/products/")

    def test_returns_none_without_avatars(self):
        self.assertIsNone(shop_avatar_url(_user()))

    def test_prefers_shop_avatar(self):
        user = _user(
            shop_avatar=_Avatar("shop_avatars/a.jpg"),
            profile_avatar=_Avatar("avatars/b.jpg"),
        )
        self.assertEqual(shop_avatar_url(user), "/media/shop_avatars/a.jpg")

    def test_falls_back_to_profile_avatar(self):
        user = _user(profile_avatar=_Avatar("avatars/b.jpg"))
        self.assertEqual(shop_avatar_url(user), "/media/avatars/b.jpg")

    def test_absolute_urls_are_returned_unchanged(self):
        user = _user(shop_avatar=_Avatar("https://res.cloudinary.com/d/image/upload/a.jpg"))
        self.assertEqual(
            shop_avatar_url(user, self.request),
            "https://res.cloudinary.com/d/image/upload/a.jpg",
        )

    def test_relative_url_is_made_absolute_with_a_request(self):
        user = _user(shop_avatar=_Avatar("/media/shop_avatars/a.jpg"))
        self.assertEqual(
            shop_avatar_url(user, self.request),
            "http://testserver/media/shop_avatars/a.jpg",
        )

    def test_storage_path_is_resolved_through_default_storage(self):
        user = _user(shop_avatar=_Avatar("shop_avatars/a.jpg"))
        self.assertEqual(
            shop_avatar_url(user, self.request),
            "http://testserver/media/shop_avatars/a.jpg",
        )

    def test_falls_back_to_profile_avatar_when_shop_file_is_missing(self):
        user = _user(shop_avatar=_AvatarWithoutFile(), profile_avatar=_Avatar("avatars/b.jpg"))
        self.assertEqual(shop_avatar_url(user), "/media/avatars/b.jpg")

    def test_blank_avatar_url_returns_none(self):
        user = _user(shop_avatar=_Avatar("   "))
        self.assertIsNone(shop_avatar_url(user))
