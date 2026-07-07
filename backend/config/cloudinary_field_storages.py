import os

from django.core.files.storage import FileSystemStorage

_use_cloudinary = bool(os.environ.get("CLOUDINARY_URL", "").strip())

if _use_cloudinary:
    from cloudinary_storage.storage import MediaCloudinaryStorage, VideoMediaCloudinaryStorage

    image_field_storage = MediaCloudinaryStorage()
    video_field_storage = VideoMediaCloudinaryStorage()
    audio_field_storage = VideoMediaCloudinaryStorage()
else:
    _local_storage = FileSystemStorage()
    image_field_storage = _local_storage
    video_field_storage = _local_storage
    audio_field_storage = _local_storage
