from django.test import SimpleTestCase

from config.cloudinary_resource_type import cloudinary_resource_type_for_name


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
