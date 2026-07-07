from django.core.files.storage import FileSystemStorage
from django.test import SimpleTestCase

from config import cloudinary_field_storages
from config.cloudinary_resource_type import cloudinary_resource_type_for_name


class PerFieldCloudinaryStorageTests(SimpleTestCase):
    def test_image_field_storage_urls_use_image_upload_path(self):
        storage = cloudinary_field_storages.image_field_storage
        if isinstance(storage, FileSystemStorage):
            self.skipTest("Cloudinary not configured")
        self.assertEqual(storage._get_resource_type("community_groups/messages/photo"), "image")
        url = storage.url("community_groups/messages/20260703_102502-chat_jlagxx")
        self.assertIn("/image/upload/", url)
        self.assertNotIn("/raw/upload/", url)

    def test_video_field_storage_urls_use_video_upload_path(self):
        storage = cloudinary_field_storages.video_field_storage
        if isinstance(storage, FileSystemStorage):
            self.skipTest("Cloudinary not configured")
        self.assertEqual(storage._get_resource_type("community_groups/messages/clip"), "video")
        url = storage.url("community_groups/messages/clip-id")
        self.assertIn("/video/upload/", url)
        self.assertNotIn("/raw/upload/", url)


class CloudinaryResourceTypeTests(SimpleTestCase):
    def test_video_extensions_use_video_resource_type(self):
        for name in (
            "community_groups/messages/clip.mp4",
            "posts/story.webm",
            "uploads/clip.MOV",
        ):
            with self.subTest(name=name):
                self.assertEqual(cloudinary_resource_type_for_name(name), "video")

    def test_audio_extensions_use_video_resource_type(self):
        for name in (
            "messaging/audio/note.webm",
            "messaging/audio/note.ogg",
            "messaging/audio/note.m4a",
        ):
            with self.subTest(name=name):
                self.assertEqual(cloudinary_resource_type_for_name(name), "video")

    def test_image_extensions_use_image_resource_type(self):
        for name in (
            "community_groups/messages/photo.jpg",
            "profiles/avatar.PNG",
            "posts/pic.webp",
        ):
            with self.subTest(name=name):
                self.assertEqual(cloudinary_resource_type_for_name(name), "image")

    def test_unknown_extensions_use_raw_resource_type(self):
        self.assertEqual(cloudinary_resource_type_for_name("files/doc.pdf"), "raw")
