import os
import uuid

from django.core.files.storage import default_storage
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from social.video_validation import validate_post_video_file

HIGHLIGHT_IMAGE_MAX_BYTES = 12 * 1024 * 1024
HIGHLIGHT_IMAGE_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png", ".webp", ".gif"})


def _absolute_url(request, path: str) -> str:
    url = default_storage.url(path)
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

        path = default_storage.save(
            f"highlights/{kind}s/{uuid.uuid4().hex}{ext}",
            uploaded,
        )
        return Response(
            {"url": _absolute_url(request, path), "kind": kind},
            status=status.HTTP_201_CREATED,
        )
