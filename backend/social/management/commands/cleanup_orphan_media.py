"""Delete orphaned Cloudinary assets under posts/ that no Post references.

Eager uploads that never get published leave assets behind. Run periodically:

    python manage.py cleanup_orphan_media --older-than-hours 24 --dry-run
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from django.core.management.base import BaseCommand

from social.models import Post, PostMedia


def _configure_cloudinary() -> bool:
    url = (os.environ.get("CLOUDINARY_URL") or "").strip()
    if not url:
        return False
    try:
        import cloudinary
    except ImportError:
        return False
    cloudinary.config(cloudinary_url=url)
    return True


def _collect_referenced_public_ids() -> set[str]:
    ids: set[str] = set()

    def add(value: str | None) -> None:
        if not value:
            return
        # django-cloudinary-storage stores the public_id (sometimes with extension).
        name = str(value).strip().lstrip("/")
        if not name:
            return
        ids.add(name)
        base, ext = os.path.splitext(name)
        if ext:
            ids.add(base)

    for row in Post.objects.all().only("image", "video", "overlay"):
        add(row.image.name if row.image else None)
        add(row.video.name if row.video else None)
        add(row.overlay.name if row.overlay else None)
    for row in PostMedia.objects.all().only("image", "video", "overlay"):
        add(row.image.name if row.image else None)
        add(row.video.name if row.video else None)
        add(row.overlay.name if row.overlay else None)
    return ids


class Command(BaseCommand):
    help = "Delete unreferenced Cloudinary posts/ assets older than a threshold."

    def add_arguments(self, parser):
        parser.add_argument(
            "--older-than-hours",
            type=int,
            default=24,
            help="Only delete assets older than this many hours (default 24).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List orphans without deleting.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=100,
            help="Max assets to delete/list per run (default 100).",
        )

    def handle(self, *args, **options):
        if not _configure_cloudinary():
            self.stderr.write(self.style.ERROR("Cloudinary is not configured."))
            return

        import cloudinary.api
        import cloudinary.uploader

        older_than = timedelta(hours=max(1, options["older_than_hours"]))
        cutoff = datetime.now(timezone.utc) - older_than
        referenced = _collect_referenced_public_ids()
        dry_run = options["dry_run"]
        limit = max(1, options["limit"])

        deleted = 0
        prefixes = (
            ("image", "posts/"),
            ("video", "posts/videos/"),
            ("image", "posts/overlays/"),
        )

        for resource_type, prefix in prefixes:
            next_cursor = None
            while deleted < limit:
                kwargs = {
                    "type": "upload",
                    "resource_type": resource_type,
                    "prefix": prefix,
                    "max_results": min(100, limit - deleted),
                }
                if next_cursor:
                    kwargs["next_cursor"] = next_cursor
                try:
                    page = cloudinary.api.resources(**kwargs)
                except Exception as exc:
                    self.stderr.write(self.style.ERROR(f"List failed ({resource_type} {prefix}): {exc}"))
                    break

                for asset in page.get("resources") or []:
                    if deleted >= limit:
                        break
                    public_id = asset.get("public_id") or ""
                    if not public_id or public_id in referenced:
                        continue
                    created_at = asset.get("created_at")
                    if created_at:
                        try:
                            created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                            if created > cutoff:
                                continue
                        except ValueError:
                            pass

                    if dry_run:
                        self.stdout.write(f"orphan: {resource_type}/{public_id}")
                        deleted += 1
                        continue

                    try:
                        cloudinary.uploader.destroy(public_id, resource_type=resource_type, invalidate=True)
                        self.stdout.write(self.style.WARNING(f"deleted: {resource_type}/{public_id}"))
                        deleted += 1
                    except Exception as exc:
                        self.stderr.write(self.style.ERROR(f"delete failed {public_id}: {exc}"))

                next_cursor = page.get("next_cursor")
                if not next_cursor:
                    break

        verb = "Matched" if dry_run else "Deleted"
        self.stdout.write(self.style.SUCCESS(f"{verb} {deleted} orphan asset(s)."))
