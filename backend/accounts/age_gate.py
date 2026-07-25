"""Account age rules (signup + profile birth year)."""

from __future__ import annotations

from datetime import date

# Minimum age to create a Delve account (year-of-birth approximation).
MIN_ACCOUNT_AGE = 18


def max_birth_year_for_min_age(*, as_of: date | None = None, min_age: int = MIN_ACCOUNT_AGE) -> int:
    day = as_of or date.today()
    return day.year - min_age


def parse_birth_year(value) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("Birth year must be a number.") from exc


def validate_account_birth_year(value, *, required: bool = False) -> int | None:
    """
    Validate birth year for account age checks.
    Returns None only when not required and value is empty.
    """
    if value is None or value == "":
        if required:
            raise ValueError("Birth year is required.")
        return None
    year = parse_birth_year(value)
    current = date.today().year
    if year < 1900 or year > current:
        raise ValueError(f"Birth year must be between 1900 and {current}.")
    oldest_allowed = max_birth_year_for_min_age()
    if year > oldest_allowed:
        raise ValueError(f"You must be at least {MIN_ACCOUNT_AGE} to create a Delve account.")
    return year
