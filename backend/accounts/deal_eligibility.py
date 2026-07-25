"""Phase 3 — richer eligibility rules + soft profile matching."""

from __future__ import annotations

from datetime import date
from typing import Any

from .models import TravelOffer, TravelOfferEligibility

# Southern African Development Community (ISO 3166-1 alpha-2).
SADC_COUNTRY_CODES = frozenset(
    {
        "AO",  # Angola
        "BW",  # Botswana
        "CD",  # DR Congo
        "KM",  # Comoros
        "LS",  # Lesotho
        "MG",  # Madagascar
        "MW",  # Malawi
        "MU",  # Mauritius
        "MZ",  # Mozambique
        "NA",  # Namibia
        "SC",  # Seychelles
        "SZ",  # Eswatini
        "TZ",  # Tanzania
        "ZA",  # South Africa
        "ZM",  # Zambia
        "ZW",  # Zimbabwe
    }
)


def profile_age(profile, *, as_of: date | None = None) -> int | None:
    """Approximate age from optional birth_year on the profile."""
    year = getattr(profile, "birth_year", None) if profile is not None else None
    if year is None:
        return None
    try:
        y = int(year)
    except (TypeError, ValueError):
        return None
    if y < 1900 or y > date.today().year:
        return None
    return (as_of or date.today()).year - y


def age_range_label(min_age: int | None, max_age: int | None) -> str:
    if min_age is not None and max_age is not None:
        return f"Ages {min_age}–{max_age}"
    if max_age is not None and min_age is None:
        return f"Under {max_age + 1}"
    if min_age is not None:
        return f"Ages {min_age}+"
    return ""


def party_size_label(min_party: int | None, max_party: int | None) -> str:
    if min_party is not None and max_party is not None:
        if min_party == max_party:
            return f"Groups of {min_party}"
        return f"Groups of {min_party}–{max_party}"
    if min_party is not None:
        return f"Groups of {min_party}+"
    if max_party is not None:
        return f"Groups up to {max_party}"
    return ""


def offer_constraint_bits(offer: TravelOffer) -> list[str]:
    bits: list[str] = []
    age = age_range_label(offer.min_age, offer.max_age)
    if age:
        bits.append(age)
    party = party_size_label(offer.min_party_size, offer.max_party_size)
    if party:
        bits.append(party)
    return bits


def enriched_eligibility_display(offer: TravelOffer) -> str:
    label = (offer.eligibility_label or "").strip() or offer.get_eligibility_display()
    extras = offer_constraint_bits(offer)
    if not extras:
        return label
    return f"{label} · {' · '.join(extras)}"


def age_fits(age: int | None, min_age: int | None, max_age: int | None) -> bool | None:
    if min_age is None and max_age is None:
        return True
    if age is None:
        return None
    if min_age is not None and age < min_age:
        return False
    if max_age is not None and age > max_age:
        return False
    return True


def assess_offer_qualification(offer: TravelOffer, profile) -> dict[str, Any]:
    """
    Soft match for the signed-in traveller.

    may_qualify:
      True  — profile signals suggest they qualify
      False — profile signals suggest they do not
      None  — not enough profile data (or needs proof we can't infer)
    """
    if offer.eligibility == TravelOfferEligibility.EVERYONE and not (
        offer.min_age or offer.max_age or offer.min_party_size or offer.max_party_size
    ):
        return {
            "may_qualify": True,
            "qualify_hint": "Open to everyone",
        }

    country = (getattr(profile, "country_code", None) or "").strip().upper() if profile else ""
    age = profile_age(profile)
    signals: list[bool | None] = []
    hints: list[str] = []

    # Base eligibility bucket
    if offer.eligibility == TravelOfferEligibility.EVERYONE:
        signals.append(True)
    elif offer.eligibility == TravelOfferEligibility.SADC:
        if not country:
            signals.append(None)
            hints.append("Add your country in profile to see if this SADC rate may apply")
        elif country in SADC_COUNTRY_CODES:
            signals.append(True)
            hints.append("Your country is in SADC — you may qualify")
        else:
            signals.append(False)
            hints.append("This rate is for SADC residents")
    elif offer.eligibility == TravelOfferEligibility.LOCAL:
        if not country:
            signals.append(None)
            hints.append("Add your country in profile to check local rates")
        elif country == "NA":
            signals.append(True)
            hints.append("Your profile looks local — you may qualify")
        else:
            signals.append(False)
            hints.append("This rate is for local / regional residents")
    elif offer.eligibility == TravelOfferEligibility.STUDENT:
        signals.append(None)
        hints.append("Student rates need a valid student ID — we can’t confirm from your profile")
    elif offer.eligibility == TravelOfferEligibility.CUSTOM:
        signals.append(None)
        hints.append("Check the claim steps — this one has custom eligibility")

    # Age constraints
    age_ok = age_fits(age, offer.min_age, offer.max_age)
    if offer.min_age is not None or offer.max_age is not None:
        signals.append(age_ok)
        label = age_range_label(offer.min_age, offer.max_age)
        if age_ok is True:
            hints.append(f"Your age fits ({label})")
        elif age_ok is False:
            hints.append(f"This deal is for {label.lower()}")
        else:
            hints.append(f"Add your birth year in profile to check {label.lower()}")

    # Party size — informational only (booking context not available here)
    if offer.min_party_size is not None or offer.max_party_size is not None:
        hints.append(party_size_label(offer.min_party_size, offer.max_party_size))

    if any(s is False for s in signals):
        may = False
    elif any(s is None for s in signals):
        may = None
    else:
        may = True

    hint = hints[0] if hints else ""
    if may is True and not hint:
        hint = "You may qualify"
    elif may is False and not hint:
        hint = "You may not qualify based on your profile"
    elif may is None and not hint:
        hint = "Confirm eligibility when you claim"

    return {"may_qualify": may, "qualify_hint": hint}


def eligibility_fields_payload(offer: TravelOffer, profile=None) -> dict[str, Any]:
    match = assess_offer_qualification(offer, profile)
    return {
        "min_age": offer.min_age,
        "max_age": offer.max_age,
        "min_party_size": offer.min_party_size,
        "max_party_size": offer.max_party_size,
        "age_label": age_range_label(offer.min_age, offer.max_age) or None,
        "party_label": party_size_label(offer.min_party_size, offer.max_party_size) or None,
        "may_qualify": match["may_qualify"],
        "qualify_hint": match["qualify_hint"],
    }
