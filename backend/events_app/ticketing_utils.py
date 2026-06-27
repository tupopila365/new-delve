from __future__ import annotations

from .models import Event


def event_ticketing_mode(event: Event) -> str:
    """free | on_platform | external"""
    if event.is_free:
        return "free"
    ticket_url = (event.ticket_url or "").strip()
    price = (event.price or "").strip()
    if ticket_url:
        return "external"
    if price:
        return "on_platform"
    return "free"


def validate_event_ticketing(*, is_free: bool, price: str, ticket_url: str, from_template: bool = False) -> dict:
    """Normalize ticketing fields and raise-free validation dict for serializers."""
    price = (price or "").strip()
    ticket_url = (ticket_url or "").strip()

    if is_free:
        return {"is_free": True, "price": "", "ticket_url": ticket_url}

    if from_template:
        if not ticket_url:
            raise ValueError("Recurring templates need an external ticket link for paid entry.")
        return {"is_free": False, "price": price, "ticket_url": ticket_url}

    if ticket_url and price:
        # External is primary when both are set; price is optional display copy.
        return {"is_free": False, "price": price, "ticket_url": ticket_url}

    if ticket_url:
        return {"is_free": False, "price": price, "ticket_url": ticket_url}

    if price:
        return {"is_free": False, "price": price, "ticket_url": ""}

    raise ValueError("Paid events need either a price (sell on DELVE) or an external ticket link.")
