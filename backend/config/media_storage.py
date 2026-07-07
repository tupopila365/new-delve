from cloudinary_storage.storage import MediaCloudinaryStorage

from .cloudinary_resource_type import cloudinary_resource_type_for_name


class DelveMediaCloudinaryStorage(MediaCloudinaryStorage):
    """Pick Cloudinary resource_type from file extension (videos, images, raw)."""

    def _get_resource_type(self, name):
        return cloudinary_resource_type_for_name(name)
