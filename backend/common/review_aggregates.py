"""Rating aggregate and review media helpers shared by review services."""

from __future__ import annotations

from decimal import Decimal
from typing import Iterable, Sequence

from .media_urls import absolute_media_url

STAR_VALUES = (5, 4, 3, 2, 1)


def apply_rating_aggregate(obj, ratings: Iterable, update_fields: Sequence[str] = ()) -> None:
    """Persist ``rating_avg`` / ``rating_count`` on ``obj`` from ``ratings``."""
    values = [float(rating) for rating in ratings]
    if values:
        obj.rating_avg = Decimal(str(round(sum(values) / len(values), 2)))
        obj.rating_count = len(values)
    else:
        obj.rating_avg = Decimal("0")
        obj.rating_count = 0
    obj.save(update_fields=["rating_avg", "rating_count", *update_fields])


def rating_distribution(ratings: Iterable) -> dict[str, int]:
    """Count reviews per star value, keyed by star as a string (5 → 1)."""
    counts = {star: 0 for star in STAR_VALUES}
    for rating in ratings:
        star = int(rating) if rating else 0
        if star in counts:
            counts[star] += 1
    return {str(star): counts[star] for star in STAR_VALUES}


def normalize_review_media(raw, request=None) -> list[dict]:
    """Coerce stored review media into ``[{url, kind}]`` with absolute urls."""
    out: list[dict] = []
    if not isinstance(raw, list):
        return out
    for item in raw:
        if isinstance(item, str):
            url = item.strip()
            kind = "image"
        elif isinstance(item, dict):
            url = str(item.get("url") or item.get("image") or "").strip()
            kind = "video" if item.get("kind") == "video" else "image"
        else:
            continue
        if not url:
            continue
        out.append({"url": absolute_media_url(url, request), "kind": kind})
    return out
