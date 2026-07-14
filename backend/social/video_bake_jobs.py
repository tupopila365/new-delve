"""Deferred video bake jobs (Phase 2).

Share returns immediately after persisting edit instructions. A daemon thread
attempts the ffmpeg bake right after commit; ``bake_pending_posts`` catches
anything left in ``processing`` (e.g. dyno restart).
"""

from __future__ import annotations

import logging
import threading
from typing import Literal

from django.core.files.base import ContentFile
from django.db import close_old_connections, transaction

from .models import Post, PostMedia, ProcessingStatus
from .video_effects import bake_video_field

logger = logging.getLogger(__name__)

OwnerKind = Literal["post", "postmedia"]


def aggregate_processing_status(post: Post) -> str:
    """Roll up Post + PostMedia bake status for the feed API."""
    statuses = [post.processing_status or ProcessingStatus.READY]
    for row in post.media.all():
        statuses.append(row.processing_status or ProcessingStatus.READY)
    if any(s == ProcessingStatus.PROCESSING for s in statuses):
        return ProcessingStatus.PROCESSING
    if any(s == ProcessingStatus.FAILED for s in statuses):
        return ProcessingStatus.FAILED
    return ProcessingStatus.READY


def _read_overlay_field(owner) -> bytes | None:
    field = getattr(owner, "overlay", None)
    if field is None or not field:
        return None
    try:
        field.open("rb")
        try:
            return field.read()
        finally:
            field.close()
    except OSError:
        return None


def _clear_overlay_field(owner) -> None:
    field = getattr(owner, "overlay", None)
    if field is None or not field:
        return
    name = field.name
    try:
        field.delete(save=False)
    except OSError:
        pass
    if name:
        try:
            field.storage.delete(name)
        except OSError:
            pass
    owner.overlay = None


def queue_deferred_bake(owner, *, trim, grade, overlay_bytes) -> list[str]:
    """Persist edit instructions and mark the owner as processing.

    Trim offsets are stored so the unbaked clip still previews correctly on
    Cloudinary. Returns field names that the caller should save.
    """
    changed: list[str] = []

    if grade is not None:
        owner.edit_grade = grade
        changed.append("edit_grade")
    else:
        if owner.edit_grade is not None:
            owner.edit_grade = None
            changed.append("edit_grade")

    if overlay_bytes:
        _clear_overlay_field(owner)
        owner.overlay.save(
            f"{getattr(owner, 'pk', 'slide') or 'slide'}-overlay.png",
            ContentFile(overlay_bytes),
            save=False,
        )
        changed.append("overlay")
    elif owner.overlay:
        _clear_overlay_field(owner)
        changed.append("overlay")

    if trim is not None:
        start, end = trim
        owner.video_trim_start = start
        owner.video_trim_end = end
        changed.extend(["video_trim_start", "video_trim_end"])

    owner.processing_status = ProcessingStatus.PROCESSING
    owner.processing_error = ""
    changed.extend(["processing_status", "processing_error"])

    # Deduplicate while preserving order.
    seen: set[str] = set()
    ordered: list[str] = []
    for name in changed:
        if name not in seen:
            seen.add(name)
            ordered.append(name)
    return ordered


def schedule_bake(kind: OwnerKind, pk: int) -> None:
    """Best-effort bake after the DB transaction commits."""

    def _run() -> None:
        close_old_connections()
        try:
            bake_owner(kind, pk)
        except Exception:
            logger.exception("Deferred bake failed for %s %s", kind, pk)
        finally:
            close_old_connections()

    transaction.on_commit(lambda: threading.Thread(target=_run, daemon=True).start())


def bake_owner(kind: OwnerKind, pk: int) -> bool:
    """Run the ffmpeg bake for one Post or PostMedia row. Returns True on success."""
    model = Post if kind == "post" else PostMedia
    with transaction.atomic():
        try:
            owner = model.objects.select_for_update().get(pk=pk)
        except model.DoesNotExist:
            return False

        if owner.processing_status != ProcessingStatus.PROCESSING:
            return False
        if not getattr(owner, "video", None):
            owner.processing_status = ProcessingStatus.READY
            owner.processing_error = ""
            owner.edit_grade = None
            _clear_overlay_field(owner)
            owner.save(
                update_fields=[
                    "processing_status",
                    "processing_error",
                    "edit_grade",
                    "overlay",
                ]
            )
            return True

        grade = owner.edit_grade if isinstance(owner.edit_grade, dict) else None
        overlay_bytes = _read_overlay_field(owner)
        trim = None
        if owner.video_trim_start is not None and owner.video_trim_end is not None:
            trim = (float(owner.video_trim_start), float(owner.video_trim_end))

        ok = bake_video_field(
            owner.video,
            trim=trim,
            grade=grade,
            overlay_bytes=overlay_bytes,
        )

        if ok:
            owner.video_trim_start = None
            owner.video_trim_end = None
            owner.edit_grade = None
            _clear_overlay_field(owner)
            owner.processing_status = ProcessingStatus.READY
            owner.processing_error = ""
            owner.save(
                update_fields=[
                    "video",
                    "video_trim_start",
                    "video_trim_end",
                    "edit_grade",
                    "overlay",
                    "processing_status",
                    "processing_error",
                ]
            )
            if kind == "post":
                # Keep carousel slide-0 mirror in sync after bake.
                media0 = PostMedia.objects.filter(post_id=pk, order=0).first()
                if media0 is not None:
                    media0.video = owner.video.name if owner.video else None
                    media0.video_trim_start = None
                    media0.video_trim_end = None
                    media0.edit_grade = None
                    _clear_overlay_field(media0)
                    media0.processing_status = ProcessingStatus.READY
                    media0.processing_error = ""
                    media0.save(
                        update_fields=[
                            "video",
                            "video_trim_start",
                            "video_trim_end",
                            "edit_grade",
                            "overlay",
                            "processing_status",
                            "processing_error",
                        ]
                    )
            return True

        owner.processing_status = ProcessingStatus.FAILED
        owner.processing_error = "Could not finalize video effects."
        owner.save(update_fields=["processing_status", "processing_error"])
        if kind == "post":
            PostMedia.objects.filter(post_id=pk, order=0).update(
                processing_status=ProcessingStatus.FAILED,
                processing_error=owner.processing_error,
            )
        return False


def bake_pending(*, limit: int = 20, retry_failed: bool = False) -> int:
    """Bake up to ``limit`` pending (or failed) video rows. Returns success count."""
    statuses = [ProcessingStatus.PROCESSING]
    if retry_failed:
        statuses.append(ProcessingStatus.FAILED)

    done = 0
    post_ids = list(
        Post.objects.filter(processing_status__in=statuses, video__isnull=False)
        .exclude(video="")
        .order_by("id")
        .values_list("id", flat=True)[:limit]
    )
    for pk in post_ids:
        if bake_owner("post", pk):
            done += 1

    remaining = max(0, limit - len(post_ids))
    if remaining:
        media_ids = list(
            PostMedia.objects.filter(processing_status__in=statuses, video__isnull=False)
            .exclude(video="")
            .order_by("id")
            .values_list("id", flat=True)[:remaining]
        )
        for pk in media_ids:
            if bake_owner("postmedia", pk):
                done += 1
    return done
