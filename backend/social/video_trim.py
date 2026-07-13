"""Server-side video trimming.

Two delivery paths, matching an Instagram-style pipeline:

* **Cloudinary** (production): we keep the original upload and trim on delivery
  via ``so_``/``eo_`` URL transforms (see ``config.cloudinary_media``). Nothing
  is re-encoded here — we only persist the trim offsets on the model.
* **Local / self-hosted** (``FileSystemStorage``): Cloudinary transforms are not
  available, so we physically cut the stored file with ffmpeg (bundled through
  ``imageio-ffmpeg`` — no system install required).
"""

from __future__ import annotations

import os
import subprocess
import tempfile

from django.core.files import File

# Keep in sync with the client (videoTrimUtils.MAX_TRIM_DURATION_SEC).
MAX_TRIM_SEC = 60.0


def using_cloudinary() -> bool:
    return bool(os.environ.get("CLOUDINARY_URL", "").strip())


def _ffmpeg_exe():
    """Locate an ffmpeg binary: prefer the pip-bundled one, else PATH."""
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        from shutil import which

        return which("ffmpeg")


def parse_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def parse_trim_range(data, prefix=""):
    """Return a validated (start, end) tuple in seconds, or None for no trim."""
    if data is None:
        return None
    start = parse_float(data.get(f"{prefix}trim_start"))
    end = parse_float(data.get(f"{prefix}trim_end"))
    if start is None or end is None:
        return None
    start = max(0.0, start)
    if end - start <= 0.05:
        return None
    if end - start > MAX_TRIM_SEC + 0.5:
        end = start + MAX_TRIM_SEC
    return (start, end)


def _local_path(field_file):
    """Return the on-disk path for a FileField, or None if not local."""
    try:
        return field_file.path
    except (NotImplementedError, ValueError, AttributeError):
        return None


def trim_saved_video(field_file, start: float, end: float) -> bool:
    """Physically trim a saved FileField in place to ``[start, end]`` seconds.

    Re-encodes to a browser-friendly MP4 (H.264/AAC) so the result plays and
    seeks correctly everywhere. Returns True when the file was trimmed.
    """
    if field_file is None or not field_file:
        return False
    if end is None or start is None or end - start <= 0.05:
        return False

    exe = _ffmpeg_exe()
    if not exe:
        return False

    src_path = _local_path(field_file)
    if not src_path or not os.path.exists(src_path):
        return False

    duration = max(0.0, float(end) - float(start))
    out_fd, out_path = tempfile.mkstemp(suffix=".mp4")
    os.close(out_fd)

    cmd = [
        exe,
        "-y",
        "-ss", f"{float(start):.3f}",
        "-i", src_path,
        "-t", f"{duration:.3f}",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        "-c:a", "aac",
        "-movflags", "+faststart",
        out_path,
    ]

    try:
        subprocess.run(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=180,
            check=True,
        )
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError):
        _safe_remove(out_path)
        return False

    if not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
        _safe_remove(out_path)
        return False

    base = os.path.splitext(os.path.basename(field_file.name))[0] or "clip"
    new_name = f"{base}-trim.mp4"
    old_path = src_path

    try:
        with open(out_path, "rb") as fh:
            # save=False: the caller persists the owning model row.
            field_file.save(new_name, File(fh), save=False)
    except OSError:
        _safe_remove(out_path)
        return False

    _safe_remove(out_path)
    # Drop the original untrimmed source now that the field points elsewhere.
    if old_path != _local_path(field_file):
        _safe_remove(old_path)
    return True


def _run_ffmpeg_trim(src_path: str, start: float, end: float, out_path: str) -> bool:
    """Cut ``src_path`` to ``[start, end]`` seconds into ``out_path``."""
    if end is None or start is None or end - start <= 0.05:
        return False

    exe = _ffmpeg_exe()
    if not exe or not src_path or not os.path.exists(src_path):
        return False

    duration = max(0.0, float(end) - float(start))
    cmd = [
        exe,
        "-y",
        "-ss", f"{float(start):.3f}",
        "-i", src_path,
        "-t", f"{duration:.3f}",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        "-c:a", "aac",
        "-movflags", "+faststart",
        out_path,
    ]

    try:
        subprocess.run(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=180,
            check=True,
        )
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError):
        return False

    return os.path.exists(out_path) and os.path.getsize(out_path) > 0


def trim_storage_file(storage, path: str, start: float, end: float) -> str | None:
    """Physically trim a file already saved on local storage. Returns the new path."""
    try:
        src_path = storage.path(path)
    except (NotImplementedError, ValueError, AttributeError):
        return None

    out_fd, out_path = tempfile.mkstemp(suffix=".mp4")
    os.close(out_fd)

    if not _run_ffmpeg_trim(src_path, start, end, out_path):
        _safe_remove(out_path)
        return None

    base = os.path.splitext(os.path.basename(path))[0] or "clip"
    new_name = f"{base}-trim.mp4"
    try:
        with open(out_path, "rb") as fh:
            saved = storage.save(new_name, File(fh))
    except OSError:
        _safe_remove(out_path)
        return None

    _safe_remove(out_path)
    try:
        storage.delete(path)
    except OSError:
        pass
    return saved


def _safe_remove(path: str) -> None:
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except OSError:
        pass
