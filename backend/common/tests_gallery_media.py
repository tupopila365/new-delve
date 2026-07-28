"""Unit tests for listing gallery media normalization."""

from django.test import SimpleTestCase

from common.gallery_media import (
    GALLERY_MEDIA_MAX_ITEMS,
    media_url_kind,
    normalize_gallery_media_item,
    validate_gallery_media_list,
)


class MediaUrlKindTests(SimpleTestCase):
    def test_video_suffixes_are_detected(self):
        for url in ("/media/a.mp4", "clip.WEBM", "https://x.test/b.mov", "c.m4v"):
            self.assertEqual(media_url_kind(url), "video")

    def test_query_string_is_ignored(self):
        self.assertEqual(media_url_kind("https://x.test/clip.mp4?v=2"), "video")

    def test_cloudinary_video_path_is_detected(self):
        self.assertEqual(media_url_kind("https://res.cloudinary.com/d/video/upload/x"), "video")

    def test_everything_else_is_an_image(self):
        for url in ("", None, "  ", "/media/a.jpg", "https://x.test/photo"):
            self.assertEqual(media_url_kind(url), "image")


class NormalizeGalleryMediaItemTests(SimpleTestCase):
    def test_string_becomes_image_item(self):
        self.assertEqual(
            normalize_gallery_media_item("  /media/a.jpg  "),
            {"url": "/media/a.jpg", "kind": "image"},
        )

    def test_dict_keeps_known_kind(self):
        self.assertEqual(
            normalize_gallery_media_item({"url": "/media/a.mp4", "kind": "video"}),
            {"url": "/media/a.mp4", "kind": "video"},
        )

    def test_unknown_kind_falls_back_to_image(self):
        self.assertEqual(
            normalize_gallery_media_item({"url": "/media/a.mp4", "kind": "audio"}),
            {"url": "/media/a.mp4", "kind": "image"},
        )

    def test_blank_and_unsupported_items_are_dropped(self):
        for raw in ("", "   ", {}, {"url": "  "}, {"url": None}, None, 42, []):
            self.assertIsNone(normalize_gallery_media_item(raw))


class ValidateGalleryMediaListTests(SimpleTestCase):
    def test_none_returns_empty_list(self):
        self.assertEqual(validate_gallery_media_list(None), [])

    def test_non_list_raises(self):
        with self.assertRaises(ValueError):
            validate_gallery_media_list({"url": "/media/a.jpg"})

    def test_mixed_items_are_normalized_and_blanks_dropped(self):
        cleaned = validate_gallery_media_list(
            ["/media/a.jpg", "", {"url": "/media/b.mp4", "kind": "video"}, None]
        )
        self.assertEqual(
            cleaned,
            [
                {"url": "/media/a.jpg", "kind": "image"},
                {"url": "/media/b.mp4", "kind": "video"},
            ],
        )

    def test_rejects_more_than_max_items(self):
        too_many = [f"/media/{i}.jpg" for i in range(GALLERY_MEDIA_MAX_ITEMS + 1)]
        with self.assertRaises(ValueError):
            validate_gallery_media_list(too_many)

    def test_respects_custom_max_items(self):
        urls = ["/media/a.jpg", "/media/b.jpg"]
        self.assertEqual(len(validate_gallery_media_list(urls, max_items=2)), 2)
        with self.assertRaises(ValueError):
            validate_gallery_media_list(urls, max_items=1)
