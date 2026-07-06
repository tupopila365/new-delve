from __future__ import annotations

from rest_framework import serializers

MAX_STORY_CHANNELS = 8
MAX_STORY_SLIDES_PER_CHANNEL = 12


def validate_story_channels(value, *, field_label: str = "Stories") -> list[dict]:
    """Normalize owner-defined highlight rings stored on listing models."""
    if value is None:
        return []
    if not isinstance(value, list):
        raise serializers.ValidationError(f"{field_label} must be a list.")
    if len(value) > MAX_STORY_CHANNELS:
        raise serializers.ValidationError(f"At most {MAX_STORY_CHANNELS} story channels.")

    normalized: list[dict] = []
    for i, channel in enumerate(value):
        if not isinstance(channel, dict):
            raise serializers.ValidationError("Each story channel must be an object.")
        label = str(channel.get("label") or "").strip()
        if not label:
            raise serializers.ValidationError("Each story channel needs a label.")
        slides_raw = channel.get("slides")
        if not isinstance(slides_raw, list) or not slides_raw:
            raise serializers.ValidationError(f'Channel "{label}" needs at least one slide.')
        if len(slides_raw) > MAX_STORY_SLIDES_PER_CHANNEL:
            raise serializers.ValidationError(
                f'Channel "{label}" has too many slides (max {MAX_STORY_SLIDES_PER_CHANNEL}).'
            )

        channel_id = str(channel.get("id") or "").strip() or f"channel-{i + 1}"
        slides: list[dict] = []
        for j, slide in enumerate(slides_raw):
            if not isinstance(slide, dict):
                raise serializers.ValidationError(f'Slide {j + 1} in "{label}" must be an object.')
            src = str(slide.get("src") or "").strip()
            headline = str(slide.get("headline") or "").strip()
            if not src or not headline:
                raise serializers.ValidationError(
                    f'Slide {j + 1} in "{label}" needs a photo or video and a caption.'
                )
            kind = slide.get("kind")
            entry: dict = {
                "id": str(slide.get("id") or "").strip() or f"{channel_id}-{j + 1}",
                "kind": kind if kind in ("image", "video") else "image",
                "src": src,
                "headline": headline,
                "sub": str(slide.get("sub") or "").strip(),
            }
            duration = slide.get("durationMs")
            if isinstance(duration, (int, float)) and duration > 0:
                entry["durationMs"] = int(duration)
            cta_path = str(slide.get("ctaPath") or "").strip()
            if cta_path:
                entry["ctaPath"] = cta_path
            cta_label = str(slide.get("ctaLabel") or "").strip()
            if cta_label:
                entry["ctaLabel"] = cta_label
            caption_x = slide.get("captionX")
            if isinstance(caption_x, (int, float)) and 0 <= caption_x <= 100:
                entry["captionX"] = float(caption_x)
            caption_y = slide.get("captionY")
            if isinstance(caption_y, (int, float)) and 0 <= caption_y <= 100:
                entry["captionY"] = float(caption_y)
            slides.append(entry)

        cover = str(channel.get("coverSrc") or "").strip() or slides[0]["src"]
        normalized.append(
            {
                "id": channel_id,
                "label": label,
                "coverSrc": cover,
                "slides": slides,
            }
        )
    return normalized
