from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from .models import Event, EventBooking, EventBookingStatus, EventRecurrence, EventRecurrenceTemplate


def _decimal_sum(value) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def provider_event_monetization_analytics(*, owner_ids: list[int], days: int = 30) -> dict:
    since = timezone.now() - timedelta(days=max(1, days))
    events = Event.objects.filter(organizer_id__in=owner_ids)
    bookings = EventBooking.objects.filter(
        event__organizer_id__in=owner_ids,
        created_at__gte=since,
    ).exclude(status=EventBookingStatus.CANCELLED)

    paid_bookings = bookings.filter(
        status__in=[EventBookingStatus.CONFIRMED, EventBookingStatus.CHECKED_IN],
        total_price__isnull=False,
    )
    revenue_agg = paid_bookings.aggregate(total=Sum("total_price"))
    on_platform_revenue = _decimal_sum(revenue_agg["total"])
    external_clicks = int(events.aggregate(total=Sum("external_ticket_clicks"))["total"] or 0)

    event_rows = []
    for ev in events.filter(starts_at__gte=since - timedelta(days=365)).order_by("-starts_at")[:50]:
        ev_bookings = bookings.filter(event_id=ev.id)
        confirmed = ev_bookings.filter(
            status__in=[EventBookingStatus.CONFIRMED, EventBookingStatus.CHECKED_IN]
        )
        rev = confirmed.aggregate(t=Sum("total_price"))["t"]
        ticket_url = (ev.ticket_url or "").strip()
        price = (ev.price or "").strip()
        event_rows.append(
            {
                "id": ev.id,
                "title": ev.title,
                "external_clicks": ev.external_ticket_clicks,
                "bookings": ev_bookings.count(),
                "confirmed_bookings": confirmed.count(),
                "revenue": float(_decimal_sum(rev)),
                "has_external_tickets": bool(ticket_url),
                "on_platform_paid": not ev.is_free and bool(price) and not ticket_url,
            }
        )
    event_rows.sort(key=lambda r: (r["revenue"], r["external_clicks"], r["bookings"]), reverse=True)

    return {
        "days": days,
        "on_platform_revenue": float(on_platform_revenue),
        "external_ticket_clicks": external_clicks,
        "total_bookings": bookings.count(),
        "confirmed_bookings": paid_bookings.count(),
        "pending_payment": bookings.filter(status=EventBookingStatus.PENDING).count(),
        "events": event_rows[:12],
    }


def next_occurrence_starts_at(template: EventRecurrenceTemplate, *, after: datetime | None = None) -> datetime:
    now = timezone.localtime(after or timezone.now())
    start_time = template.default_start_time
    weekday = int(template.weekday)

    if template.recurrence == EventRecurrence.MONTHLY:
        dom = min(max(1, template.day_of_month or 1), 28)
        candidate = now.replace(
            day=dom,
            hour=start_time.hour,
            minute=start_time.minute,
            second=0,
            microsecond=0,
        )
        if candidate <= now:
            month = candidate.month + 1
            year = candidate.year
            if month > 12:
                month = 1
                year += 1
            candidate = candidate.replace(year=year, month=month)
        return candidate

    days_ahead = (weekday - now.weekday()) % 7
    candidate = (now + timedelta(days=days_ahead)).replace(
        hour=start_time.hour,
        minute=start_time.minute,
        second=0,
        microsecond=0,
    )
    if candidate <= now:
        candidate += timedelta(days=7)

    if template.recurrence == EventRecurrence.BIWEEKLY and template.last_spawned_at:
        last = timezone.localtime(template.last_spawned_at)
        while candidate <= last:
            candidate += timedelta(days=14)
    return candidate
