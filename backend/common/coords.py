"""WGS84 coordinate helpers for DecimalField(max_digits=9, decimal_places=6)."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

COORD_QUANTUM = Decimal("0.000001")


def quantize_coord(value):
    """
    Coerce lat/lng to 6 decimal places so Google Maps floats don't fail DRF validation.
    Returns None for blank; raises ValueError for non-numeric input.
    """
    if value in (None, ""):
        return None
    try:
        d = Decimal(str(value).strip())
    except (InvalidOperation, AttributeError, TypeError) as exc:
        raise ValueError("Invalid coordinate.") from exc
    if not d.is_finite():
        raise ValueError("Invalid coordinate.")
    return d.quantize(COORD_QUANTUM, rounding=ROUND_HALF_UP)
