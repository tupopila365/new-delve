import os
import uuid

from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from config.cloudinary_field_storages import image_field_storage, video_field_storage
from config.cloudinary_media import cloudinary_video_delivery_url
from social.video_effects import bake_storage_file, parse_color_grade
from social.video_trim import parse_trim_range, trim_storage_file, using_cloudinary
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
        data = getattr(request, "data", None)
        files = getattr(request, "FILES", None)
        trim = parse_trim_range(data)
        grade = parse_color_grade(data)
        overlay = files.get("overlay") if files is not None else None
        overlay_bytes = None
        if overlay is not None:
            try:
                overlay.seek(0)
            except (OSError, AttributeError):
                pass
            overlay_bytes = overlay.read()

        if content_type.startswith("video/") or ext in {".mp4", ".webm", ".mov"}:
            validate_post_video_file(uploaded)
            kind = "video"
            if ext not in {".mp4", ".webm", ".mov"}:
                ext = ".mp4"
        else:
            kind = "image"
            if trim is not None or grade is not None or overlay_bytes:
                raise ValidationError({"file": "Video edits are only supported for videos."})
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

        trim_start = None
        trim_end = None
        if kind == "video":
            needs_bake = grade is not None or bool(overlay_bytes)
            if needs_bake:
                # Colour grade / overlays require re-encoding; fold trim in too.
                baked_path = bake_storage_file(
                    storage, path, trim=trim, grade=grade, overlay_bytes=overlay_bytes
                )
                if baked_path:
                    path = baked_path
            elif trim is not None:
                trim_start, trim_end = trim
                if using_cloudinary():
                    # Delivery transform bakes trim into the returned URL.
                    pass
                else:
                    trimmed_path = trim_storage_file(storage, path, trim_start, trim_end)
                    if trimmed_path:
                        path = trimmed_path
                        trim_start = None
                        trim_end = None

        url = _absolute_url(request, storage, path)
        if kind == "video":
            url = cloudinary_video_delivery_url(url, trim_start, trim_end)

        payload = {"url": url, "kind": kind}
        if trim_start is not None and trim_end is not None:
            payload["trim_start"] = trim_start
            payload["trim_end"] = trim_end
        return Response(payload, status=status.HTTP_201_CREATED)
