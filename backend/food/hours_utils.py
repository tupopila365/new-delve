"""Derive legacy opening_hours text from structured weekly schedule JSON."""

from __future__ import annotations

DAY_ORDER = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
DAY_SHORT = {
    "mon": "Mon",
    "tue": "Tue",
    "wed": "Wed",
    "thu": "Thu",
    "fri": "Fri",
    "sat": "Sat",
    "sun": "Sun",
}


def _format_time_12h(hhmm: str) -> str:
    parts = (hhmm or "").strip().split(":")
    if len(parts) != 2:
        return hhmm
    try:
        hour = int(parts[0])
        minute = int(parts[1])
    except ValueError:
        return hhmm
    suffix = "AM" if hour < 12 else "PM"
    display_hour = hour % 12 or 12
    if minute:
        return f"{display_hour}:{minute:02d} {suffix}"
    return f"{display_hour} {suffix}"


def normalize_schedule(value) -> list[dict]:
    if not isinstance(value, list):
        return []
    normalized: list[dict] = []
    for entry in value:
        if not isinstance(entry, dict):
            continue
        day = str(entry.get("day") or "").strip().lower()
        if day not in DAY_SHORT:
            continue
        opens = str(entry.get("opens") or "08:00").strip() or "08:00"
        closes = str(entry.get("closes") or "17:00").strip() or "17:00"
        normalized.append(
            {
                "day": day,
                "open": bool(entry.get("open")),
                "opens": opens,
                "closes": closes,
            }
        )
    return normalized


def schedule_to_opening_hours(schedule: list[dict]) -> str:
    """Group consecutive days with identical hours into readable lines."""
    by_day = {d: None for d in DAY_ORDER}
    for entry in normalize_schedule(schedule):
        by_day[entry["day"]] = entry

    lines: list[str] = []
    i = 0
    while i < len(DAY_ORDER):
        day = DAY_ORDER[i]
        entry = by_day[day]
        if not entry or not entry.get("open"):
            i += 1
            continue
        opens = entry["opens"]
        closes = entry["closes"]
        start = i
        while i + 1 < len(DAY_ORDER):
            nxt = DAY_ORDER[i + 1]
            nxt_entry = by_day[nxt]
            if (
                nxt_entry
                and nxt_entry.get("open")
                and nxt_entry["opens"] == opens
                and nxt_entry["closes"] == closes
            ):
                i += 1
            else:
                break
        start_label = DAY_SHORT[DAY_ORDER[start]]
        end_label = DAY_SHORT[DAY_ORDER[i]]
        day_part = start_label if start == i else f"{start_label}–{end_label}"
        lines.append(f"{day_part} {opens}–{closes}")
        i += 1
    return "\n".join(lines)


def schedule_to_closes_at(schedule: list[dict]) -> str:
    """Pick a representative closing label for list cards."""
    open_days = [e for e in normalize_schedule(schedule) if e.get("open")]
    if not open_days:
        return ""
    closes = open_days[0]["closes"]
    return _format_time_12h(closes)


def apply_schedule_fields(instance, schedule: list[dict]) -> None:
    normalized = normalize_schedule(schedule)
    instance.opening_hours_json = normalized
    instance.opening_hours = schedule_to_opening_hours(normalized)
    instance.closes_at = schedule_to_closes_at(normalized)
