"""Distance helpers for coin-toss proximity checks (no PostGIS required)."""

from __future__ import annotations

import math
from decimal import Decimal

EARTH_RADIUS_MILES = 3958.7613
# Max distance (miles) between voter and spot to count as "physically there"
VOTE_PROXIMITY_MILES = 0.15


def to_float(value: float | Decimal | str | None) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def haversine_miles(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """Great-circle distance between two WGS84 points, in miles."""
    rlat1, rlon1, rlat2, rlon2 = map(math.radians, (lat1, lon1, lat2, lon2))
    dlat = rlat2 - rlat1
    dlon = rlon2 - rlon1
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    )
    return 2 * EARTH_RADIUS_MILES * math.asin(min(1.0, math.sqrt(a)))


def bounding_box(lat: float, lon: float, radius_miles: float) -> tuple[float, float, float, float]:
    """Return (min_lat, max_lat, min_lon, max_lon) for a crude prefilter."""
    lat_delta = radius_miles / 69.0
    cos_lat = max(0.01, abs(math.cos(math.radians(lat))))
    lon_delta = radius_miles / (69.0 * cos_lat)
    return lat - lat_delta, lat + lat_delta, lon - lon_delta, lon + lon_delta


def within_miles(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
    miles: float,
) -> bool:
    return haversine_miles(lat1, lon1, lat2, lon2) <= miles
