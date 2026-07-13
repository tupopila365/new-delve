"""Server-side video effect baking.

Filters, colour adjustments, and overlays (text / stickers / drawings) chosen in
the editor are baked into the delivered video here so the published clip matches
the preview. We do this with a single ffmpeg pass:

* colour grade  -> ffmpeg ``eq`` / ``hue`` / ``colorchannelmixer`` / ``unsharp``
* overlays      -> a transparent PNG rendered by the client (pixel-accurate to
                   the preview) is scaled over the video with ``overlay``
* trim          -> ``-ss`` / ``-t``

The client sends the overlay PNG plus numeric grade params, so the server stays
dumb and the result is WYSIWYG for overlays. Colour grading mirrors the CSS the
preview uses and is visually close (approximate, not bit-exact).

Works for both storage backends: we read the saved file via ``open()`` (so it
also fetches from Cloudinary), re-encode locally, then save the result back.
"""

from __future__ import annotations

import os
import subprocess
import tempfile

from django.core.files import File

from .video_trim import _ffmpeg_exe, _safe_remove, parse_float

# Sepia matrix (full strength); blended toward identity by the sepia amount.
_SEPIA = (
    (0.393, 0.769, 0.189),
    (0.349, 0.686, 0.168),
    (0.272, 0.534, 0.131),
)


def parse_color_grade(data, prefix=""):
    """Read grade params from request data. Returns a dict or None when neutral."""
    if data is None:
        return None
    grade = {
        "brightness": parse_float(data.get(f"{prefix}grade_brightness")),
        "contrast": parse_float(data.get(f"{prefix}grade_contrast")),
        "saturation": parse_float(data.get(f"{prefix}grade_saturation")),
        "hue": parse_float(data.get(f"{prefix}grade_hue")),
        "sepia": parse_float(data.get(f"{prefix}grade_sepia")),
        "grayscale": parse_float(data.get(f"{prefix}grade_grayscale")),
        "sharpen": parse_float(data.get(f"{prefix}grade_sharpen")),
    }
    if not _grade_is_meaningful(grade):
        return None
    return grade


def _grade_is_meaningful(grade) -> bool:
    def off(key, neutral):
        v = grade.get(key)
        return v is not None and abs(v - neutral) > 0.01

    return (
        off("brightness", 1.0)
        or off("contrast", 1.0)
        or off("saturation", 1.0)
        or off("hue", 0.0)
        or off("sepia", 0.0)
        or off("grayscale", 0.0)
        or off("sharpen", 0.0)
    )


def build_grade_filtergraph(grade) -> str | None:
    """Translate numeric grade params into an ffmpeg filter chain."""
    if not grade:
        return None

    brightness = grade.get("brightness") or 1.0
    contrast = grade.get("contrast") or 1.0
    saturation = grade.get("saturation") or 1.0
    hue = grade.get("hue") or 0.0
    sepia = max(0.0, min(1.0, grade.get("sepia") or 0.0))
    grayscale = max(0.0, min(1.0, grade.get("grayscale") or 0.0))
    sharpen = max(0.0, grade.get("sharpen") or 0.0)

    # Grayscale desaturates; fold it into the eq saturation multiplier.
    eff_saturation = saturation * (1.0 - grayscale)

    parts = []
    # CSS brightness is multiplicative; ffmpeg eq brightness is additive. Map the
    # multiplier to a close additive shift.
    eq = (
        f"eq=brightness={(brightness - 1.0):.3f}"
        f":contrast={contrast:.3f}"
        f":saturation={max(0.0, eff_saturation):.3f}"
    )
    parts.append(eq)

    if abs(hue) > 0.01:
        parts.append(f"hue=h={hue:.2f}")

    if sepia > 0.01:
        parts.append(_sepia_mixer(sepia))

    if sharpen > 0.01:
        amount = min(2.0, sharpen)
        parts.append(f"unsharp=5:5:{amount:.2f}:5:5:0.0")

    return ",".join(parts) if parts else None


def _sepia_mixer(amount: float) -> str:
    """colorchannelmixer coefficients blending identity->sepia by ``amount``."""
    identity = ((1, 0, 0), (0, 1, 0), (0, 0, 1))
    coeffs = []
    for row in range(3):
        for col in range(3):
            blended = identity[row][col] * (1 - amount) + _SEPIA[row][col] * amount
            coeffs.append(round(blended, 4))
    rr, rg, rb, gr, gg, gb, br, bg, bb = coeffs
    return (
        "colorchannelmixer="
        f"{rr}:{rg}:{rb}:0:"
        f"{gr}:{gg}:{gb}:0:"
        f"{br}:{bg}:{bb}:0"
    )


def has_effects(*, trim=None, grade=None, overlay_bytes=None) -> bool:
    """True when there is any edit that requires re-encoding the clip."""
    return bool(build_grade_filtergraph(grade) or overlay_bytes or trim is not None)


def _bake_to_temp(src_bytes, *, src_suffix, trim, grade, overlay_bytes) -> str | None:
    """Run the ffmpeg bake pass. Returns the output temp path or None on failure."""
    graph = build_grade_filtergraph(grade)
    has_overlay = bool(overlay_bytes)
    if not graph and not has_overlay and trim is None:
        return None

    exe = _ffmpeg_exe()
    if not exe or not src_bytes:
        return None

    temp_paths = []
    try:
        in_fd, in_path = tempfile.mkstemp(suffix=src_suffix or ".mp4")
        os.write(in_fd, src_bytes)
        os.close(in_fd)
        temp_paths.append(in_path)

        overlay_path = None
        if has_overlay:
            ov_fd, overlay_path = tempfile.mkstemp(suffix=".png")
            os.write(ov_fd, overlay_bytes)
            os.close(ov_fd)
            temp_paths.append(overlay_path)

        out_fd, out_path = tempfile.mkstemp(suffix=".mp4")
        os.close(out_fd)

        cmd = [exe, "-y"]
        if trim is not None:
            start, _end = trim
            cmd += ["-ss", f"{float(start):.3f}"]
        cmd += ["-i", in_path]
        if overlay_path:
            cmd += ["-i", overlay_path]
        if trim is not None:
            start, end = trim
            cmd += ["-t", f"{max(0.0, float(end) - float(start)):.3f}"]

        # Colour grade on the base, then overlay (scaled to the video) on top.
        if overlay_path:
            if graph:
                filter_complex = (
                    f"[0:v]{graph}[base];"
                    "[1:v][base]scale2ref=w=iw:h=ih[ov][b];"
                    "[b][ov]overlay=0:0[v]"
                )
            else:
                filter_complex = (
                    "[1:v][0:v]scale2ref=w=iw:h=ih[ov][b];"
                    "[b][ov]overlay=0:0[v]"
                )
            cmd += ["-filter_complex", filter_complex, "-map", "[v]", "-map", "0:a?"]
        elif graph:
            cmd += ["-vf", graph]

        cmd += [
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
                timeout=240,
                check=True,
            )
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError):
            _safe_remove(out_path)
            return None

        if not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
            _safe_remove(out_path)
            return None
        return out_path
    except OSError:
        return None
    finally:
        for path in temp_paths:
            _safe_remove(path)


def bake_video_field(field_file, *, trim=None, grade=None, overlay_bytes=None) -> bool:
    """Bake colour grade + overlay (+ optional trim) into a saved video field.

    Returns True when the field was replaced with a processed clip.
    """
    if field_file is None or not field_file:
        return False
    if not has_effects(trim=trim, grade=grade, overlay_bytes=overlay_bytes):
        return False

    try:
        field_file.open("rb")
        try:
            src_bytes = field_file.read()
        finally:
            field_file.close()
    except OSError:
        return False

    suffix = os.path.splitext(field_file.name)[1] or ".mp4"
    out_path = _bake_to_temp(
        src_bytes, src_suffix=suffix, trim=trim, grade=grade, overlay_bytes=overlay_bytes
    )
    if not out_path:
        return False

    base_name = os.path.splitext(os.path.basename(field_file.name))[0] or "clip"
    old_name = field_file.name
    try:
        with open(out_path, "rb") as fh:
            field_file.save(f"{base_name}-edit.mp4", File(fh), save=False)
    except OSError:
        return False
    finally:
        _safe_remove(out_path)

    if old_name and old_name != field_file.name:
        try:
            field_file.storage.delete(old_name)
        except OSError:
            pass
    return True


def bake_storage_file(storage, path, *, trim=None, grade=None, overlay_bytes=None) -> str | None:
    """Bake effects into a file already saved on ``storage``. Returns new path."""
    if not has_effects(trim=trim, grade=grade, overlay_bytes=overlay_bytes):
        return None

    try:
        fh = storage.open(path, "rb")
        try:
            src_bytes = fh.read()
        finally:
            fh.close()
    except (OSError, FileNotFoundError):
        return None

    suffix = os.path.splitext(path)[1] or ".mp4"
    out_path = _bake_to_temp(
        src_bytes, src_suffix=suffix, trim=trim, grade=grade, overlay_bytes=overlay_bytes
    )
    if not out_path:
        return None

    base = os.path.splitext(os.path.basename(path))[0] or "clip"
    try:
        with open(out_path, "rb") as fh:
            saved = storage.save(f"{base}-edit.mp4", File(fh))
    except OSError:
        return None
    finally:
        _safe_remove(out_path)

    try:
        storage.delete(path)
    except OSError:
        pass
    return saved
