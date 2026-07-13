import os
import uuid

from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from config.cloudinary_field_storages import image_field_storage, video_field_storage
from config.cloudinary_media import cloudinary_video_delivery_url
from social.video_validation import validate_post_video_file

HIGHLIGHT_IMAGE_MAX_BYTES = 12 * 1024 * 1024
HIGHLIGHT_IMAGE_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png", ".webp", ".gif"})


def _absolute_url(request, storage, path: str) -> str:
    url = storage.url(path)
    if url.startswith("http"):
        return url
    return request.build_absolute_uri(url)


class HighlightMediaUploadView(APIView):
    """Upload a highlight slide image or short video; returns a public URL."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        uploaded = request.FILES.get("file")
        if not uploaded:
            raise ValidationError({"file": "A photo or video file is required."})

        content_type = (getattr(uploaded, "content_type", "") or "").lower()
        name = getattr(uploaded, "name", "") or "upload"
        ext = os.path.splitext(name)[1].lower()

        if content_type.startswith("video/") or ext in {".mp4", ".webm", ".mov"}:
            validate_post_video_file(uploaded)
            kind = "video"
            if ext not in {".mp4", ".webm", ".mov"}:
                ext = ".mp4"
        else:
            kind = "image"
            size = getattr(uploaded, "size", None)
            if size is not None and size > HIGHLIGHT_IMAGE_MAX_BYTES:
                raise ValidationError({"file": "Image must be 12MB or smaller."})
            if ext not in HIGHLIGHT_IMAGE_EXTENSIONS:
                ext = ".jpg"

        # Videos MUST use the video-scoped Cloudinary storage; the default
        # (image) storage rejects video files with the wrong resource_type,
        # which is why video uploads failed in production.
        storage = video_field_storage if kind == "video" else image_field_storage
        path = storage.save(
            f"highlights/{kind}s/{uuid.uuid4().hex}{ext}",
            uploaded,
        )
        url = _absolute_url(request, storage, path)
        if kind == "video":
            url = cloudinary_video_delivery_url(url)
        return Response(
            {"url": url, "kind": kind},
            status=status.HTTP_201_CREATED,
        )
