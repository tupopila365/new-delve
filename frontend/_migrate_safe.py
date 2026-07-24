"""Safe N$ -> display money migration. Only string-replaces N$ usages; adds imports after last complete import."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path("frontend/src")


def add_imports(text: str, imports: list[str]) -> str:
    lines = text.splitlines(keepends=True)
    last_complete = -1
    depth = 0
    for i, line in enumerate(lines):
        s = line.strip()
        if s.startswith("import {") and "from" not in s:
            depth += 1
        elif s.startswith("import ") or s.startswith("from "):
            if depth == 0:
                last_complete = i
        if "} from " in s:
            if depth > 0:
                depth -= 1
            if depth == 0:
                last_complete = i
    insert_at = last_complete + 1
    existing = text
    to_add = []
    for imp in imports:
        if imp not in existing:
            to_add.append(imp + "\n")
    if not to_add:
        return text
    return "".join(lines[:insert_at] + to_add + lines[insert_at:])


def add_hook(text: str, fn_patterns: list[str], hook: str) -> str:
    if "useDisplayMoney()" in text:
        # merge if different destructure needed — skip if already present
        return text
    for pat in fn_patterns:
        m = re.search(pat, text)
        if not m:
            continue
        # find body opening brace after match
        start = m.end() - 1
        # walk from function name to matching )
        i = m.start()
        while i < len(text) and text[i] != "(":
            i += 1
        depth = 0
        while i < len(text):
            if text[i] == "(":
                depth += 1
            elif text[i] == ")":
                depth -= 1
                if depth == 0:
                    brace = text.find("{", i)
                    if brace < 0:
                        return text
                    insert = text.find("\n", brace) + 1
                    return text[:insert] + hook + text[insert:]
            i += 1
    return text


# (relative path, import lines, hook line or None, replacements list)
JOBS: list[tuple] = []

def job(path, imports, hook, reps, fn=None):
    JOBS.append((path, imports, hook, reps, fn or [rf"export function \w+\("]))


# ---- React components with useDisplayMoney ----
HOOK = "  const { format } = useDisplayMoney()\n"
HOOK_CUR = "  const { format, currency } = useDisplayMoney()\n"
HOOK_SYM = "  const { format, symbol } = useDisplayMoney()\n"
IMP = "import { useDisplayMoney } from '{rel}/hooks/useDisplayMoney'"
IMP_FMT = "import { formatDisplayMoney } from '{rel}/lib/displayMoney'"
IMP_EXP = "import { exploreDisplayCurrency } from '{rel}/lib/exploreDestination'"


def rel_for(path: str) -> str:
    depth = path.count("/")
    return "../" * depth if depth else "./"


# Booking room card
job(
    "components/booking/BookingRoomCard.tsx",
    [IMP],
    HOOK,
    [("N${price} / night", "{format(price, { suffix: '/night' }})")],
)
job(
    "components/booking/stay/StayAvailabilityPanel.tsx",
    [IMP],
    HOOK,
    [("<span>N${estimatedTotal}</span>", "<span>{format(estimatedTotal)}</span>")],
)
job(
    "components/accommodation/AccommodationRoomBooking.tsx",
    [IMP],
    HOOK,
    [
        ('<span className="acc-room-booking__was">N${pricing.compareAt}</span>', '<span className="acc-room-booking__was">{format(pricing.compareAt)}</span>'),
        ('<span className="acc-room-booking__now">N${pricing.price}</span>', '<span className="acc-room-booking__now">{format(pricing.price)}</span>'),
        ("N${pricing.price} × {nights} {nights === 1 ? 'night' : 'nights'}", "{format(pricing.price)} × {nights} {nights === 1 ? 'night' : 'nights'}"),
        ("<span>N${total}</span>", "<span>{format(total)}</span>"),
        ("<strong>N${total}</strong>", "<strong>{format(total)}</strong>"),
    ],
)
job(
    "components/accommodation/AccommodationRoomDetailView.tsx",
    [IMP],
    HOOK,
    [
        ("N${nightly} / night", "{format(nightly, { suffix: '/night' })}"),
        ("{nightly ? `N$${nightly}` : listingTitle}", "{nightly ? format(nightly) : listingTitle}"),
    ],
)
job(
    "components/accommodation/StayRoomPicker.tsx",
    [IMP_FMT, IMP_EXP],
    None,
    [
        ("return price ? `N$${price}` : null", "return price ? formatDisplayMoney(price, exploreDisplayCurrency()) : null"),
        (
            "const compareAt = room.compareAtPrice?.trim() ? `N$${room.compareAtPrice.trim()}` : null",
            "const compareAt = room.compareAtPrice?.trim() ? formatDisplayMoney(room.compareAtPrice.trim(), exploreDisplayCurrency()) : null",
        ),
    ],
)
job(
    "components/listing/ListingRoomPicker.tsx",
    [IMP_FMT, IMP_EXP],
    None,
    [
        ("return price ? `N$${price}` : null", "return price ? formatDisplayMoney(price, exploreDisplayCurrency()) : null"),
        (
            "const compareAt = room.compareAtPrice?.trim() ? `N$${room.compareAtPrice.trim()}` : null",
            "const compareAt = room.compareAtPrice?.trim() ? formatDisplayMoney(room.compareAtPrice.trim(), exploreDisplayCurrency()) : null",
        ),
    ],
)

job(
    "components/booking/transport/BusTripReserveCard.tsx",
    [IMP],
    HOOK,
    [
        (
            "const payLabel = group ? `N$${Number(group.total_price).toFixed(0)}` : totalPrice ? `N$${totalPrice}` : `N$${trip.price}`",
            "const payLabel = group ? format(Number(group.total_price)) : totalPrice ? format(totalPrice) : format(trip.price)",
        ),
        ("N${trip.price}", "{format(trip.price)}"),
        (
            "label: `${passengers} ${passengers === 1 ? 'passenger' : 'passengers'} × N$${trip.price}`,",
            "label: `${passengers} ${passengers === 1 ? 'passenger' : 'passengers'} × ${format(trip.price)}`,",
        ),
    ],
)
job(
    "components/booking/transport/VehicleReserveCard.tsx",
    [IMP],
    HOOK,
    [
        ("N${vehicle.price_per_day}", "{format(vehicle.price_per_day)}"),
        ("<strong>N${estimatedTotal}</strong>", "<strong>{format(estimatedTotal)}</strong>"),
        ("Estimated total: <strong>N${booking.total_price}</strong>", "Estimated total: <strong>{format(booking.total_price)}</strong>"),
        ("Total: <strong>N${booking.total_price}</strong>", "Total: <strong>{format(booking.total_price)}</strong>"),
    ],
)
job(
    "components/transport/BusTripDetailView.tsx",
    [IMP],
    HOOK,
    [
        (
            """const payLabel = booking.group
    ? `N$${Number(booking.group.total_price).toFixed(0)}`
    : booking.totalPrice
      ? `N$${booking.totalPrice}`
      : `N$${trip.price}`""",
            """const payLabel = booking.group
    ? format(Number(booking.group.total_price))
    : booking.totalPrice
      ? format(booking.totalPrice)
      : format(trip.price)""",
        ),
        ("N${trip.price}/seat", "{format(trip.price, { suffix: '/seat' })}"),
        ('<span className="jd-mobilebar__title">N${trip.price}/seat</span>', '<span className="jd-mobilebar__title">{format(trip.price, { suffix: "/seat" })}</span>'),
    ],
)
job(
    "components/transport/VehicleDetailView.tsx",
    [IMP],
    HOOK,
    [
        ("N${vehicle.price_per_day}/day", "{format(vehicle.price_per_day, { suffix: '/day' })}"),
        (
            "{estTotal ? `Est. N$${estTotal}` : `N$${vehicle.price_per_day}/day`}",
            "{estTotal ? `Est. ${format(estTotal)}` : format(vehicle.price_per_day, { suffix: '/day' })}",
        ),
    ],
)
job(
    "components/events/EventTicketCard.tsx",
    [IMP],
    HOOK,
    [
        ("{payPending ? 'Processing…' : `Pay N$${bookingTotal ?? event.price ?? ''} (mock)`}", "{payPending ? 'Processing…' : `Pay ${format(bookingTotal ?? event.price ?? '')} (mock)`}"),
        ("Reserve · N${event.price}", "Reserve · {format(event.price)}"),
        ("N${event.price}", "{format(event.price)}"),
    ],
)
job(
    "components/events/EventForm.tsx",
    [IMP],
    HOOK,
    [("? `N$${state.price || '—'} on DELVE`", "? `${format(state.price) || '—'} on DELVE`")],
)
job(
    "components/events/EventDetailView.tsx",
    [IMP],
    HOOK,
    [("? `Reserve · N$${event.price}`", "? `Reserve · ${format(event.price)}`")],
)
job(
    "components/events/EventMonetizationSection.tsx",
    [IMP],
    HOOK,
    [
        ("{ value: `N$${(analytics?.on_platform_revenue ?? 0).toFixed(0)}`, label: 'On-platform revenue' },", "{ value: format(analytics?.on_platform_revenue ?? 0), label: 'On-platform revenue' },"),
        ("{row.revenue > 0 ? `N$${row.revenue.toFixed(0)}` : '—'}", "{row.revenue > 0 ? format(row.revenue) : '—'}"),
    ],
)
job(
    "components/journeys/JourneyDayByDay.tsx",
    [IMP],
    HOOK,
    [('<span className="jn-diary__cost">N${stop.cost.toLocaleString()}</span>', '<span className="jn-diary__cost">{format(stop.cost)}</span>')],
)
job(
    "components/journeys/JourneyForm.tsx",
    [IMP],
    HOOK_SYM,
    [
        ('placeholder="N$ 0"', 'placeholder={`${symbol} 0`}'),
        ('<span className="cj-cost-row__currency">N$</span>', '<span className="cj-cost-row__currency">{symbol}</span>'),
        ("<strong>N${total.toLocaleString()}</strong>", "<strong>{format(total)}</strong>"),
        ("{total > 0 && ` · N$${total.toLocaleString()}`}", "{total > 0 && ` · ${format(total)}`}"),
    ],
)
job(
    "components/provider/guides/GuideBookingCard.tsx",
    [IMP],
    HOOK,
    [("<strong>N${parseFloat(booking.total_price).toLocaleString()}</strong>", "<strong>{format(booking.total_price)}</strong>")],
)
job(
    "components/provider/stays/StayBookingCard.tsx",
    [IMP],
    HOOK,
    [("<strong>N${parseFloat(booking.total_price).toLocaleString()}</strong>", "<strong>{format(booking.total_price)}</strong>")],
)
job(
    "components/provider/stays/StayListingCard.tsx",
    [IMP],
    HOOK,
    [
        (
            "{stay.city}, {stay.region} · N${stay.price_per_night}/night · {stay.max_guests} guests · {stay.bedrooms}{' '}",
            "{stay.city}, {stay.region} · {format(stay.price_per_night, { suffix: '/night' })} · {stay.max_guests} guests · {stay.bedrooms}{' '}",
        ),
    ],
)
job(
    "components/provider/transport/BusTripListingCard.tsx",
    [IMP],
    HOOK,
    [
        (
            "{fmtWhen(trip.departs_at)} · N${trip.price}/passenger · {trip.total_seats} seats",
            "{fmtWhen(trip.departs_at)} · {format(trip.price, { suffix: '/passenger' })} · {trip.total_seats} seats",
        ),
    ],
)
job(
    "components/provider/transport/VehicleListingCard.tsx",
    [IMP],
    HOOK,
    [
        (
            "{vehicle.city}, {vehicle.region} · N${vehicle.price_per_day}/day",
            "{vehicle.city}, {vehicle.region} · {format(vehicle.price_per_day, { suffix: '/day' })}",
        ),
    ],
)
job(
    "components/provider/guides/GuideProfileSummaryCard.tsx",
    [IMP],
    HOOK,
    [("{guide.hourly_rate ? <span>N${guide.hourly_rate}/hr</span> : null}", "{guide.hourly_rate ? <span>{format(guide.hourly_rate, { suffix: '/hr' })}</span> : null}")],
)
job(
    "components/provider/guides/GuidePackageCard.tsx",
    [IMP],
    HOOK,
    [("{pkg.hours}h · N${pkg.price} per person", "{pkg.hours}h · {format(pkg.price)} per person")],
)
job(
    "components/provider/bookings/ProviderBookingCard.tsx",
    [IMP],
    HOOK,
    [("<strong>{booking.total ? `N$${booking.total.toLocaleString()}` : 'Free'}</strong>", "<strong>{booking.total ? format(booking.total) : 'Free'}</strong>")],
)
job(
    "components/provider/ProviderBookingRow.tsx",
    [IMP],
    HOOK,
    [("{booking.total ? `N$${booking.total.toLocaleString()}` : 'Free'}", "{booking.total ? format(booking.total) : 'Free'}")],
)
job(
    "components/provider/analytics/ProviderAnalyticsSummary.tsx",
    [IMP],
    HOOK,
    [("{ value: `N$${summary.revenue.toLocaleString()}`, label: 'Revenue' },", "{ value: format(summary.revenue), label: 'Revenue' },")],
)
job(
    "components/provider/stays/StayMonetizationSection.tsx",
    [IMP],
    HOOK,
    [
        ("{ value: `N$${(analytics?.on_platform_revenue ?? 0).toFixed(0)}`, label: 'Stay revenue' },", "{ value: format(analytics?.on_platform_revenue ?? 0), label: 'Stay revenue' },"),
        ("{row.revenue > 0 ? `N$${row.revenue.toFixed(0)}` : '—'}", "{row.revenue > 0 ? format(row.revenue) : '—'}"),
    ],
)
job(
    "components/provider/guides/GuideProfileForm.tsx",
    [IMP],
    HOOK_CUR,
    [("Hourly rate (N$)", "Hourly rate ({currency})")],
)
job(
    "components/provider/guides/GuidePackageForm.tsx",
    [IMP],
    HOOK_CUR,
    [("Price per person (N$)", "Price per person ({currency})")],
)
job(
    "components/provider/transport/BusTripListingForm.tsx",
    [IMP],
    HOOK_CUR,
    [("Fare per passenger (N$)", "Fare per passenger ({currency})")],
)
job(
    "components/provider/transport/VehicleListingForm.tsx",
    [IMP],
    HOOK_CUR,
    [("Daily rate (N$)", "Daily rate ({currency})")],
)
job(
    "components/provider/stays/StayListingForm.tsx",
    [IMP],
    HOOK_CUR,
    [
        ("<span>From price per night (N$)</span>", "<span>From price per night ({currency})</span>"),
        ("<span>Price / night (N$)</span>", "<span>Price / night ({currency})</span>"),
        ("<span>Compare-at price (N$)</span>", "<span>Compare-at price ({currency})</span>"),
    ],
)
job(
    "pages/ProviderBookings.tsx",
    [IMP],
    HOOK,
    [("{ value: `N$${stats.revenue.toLocaleString()}`, label: 'Revenue' },", "{ value: format(stats.revenue), label: 'Revenue' },")],
)
job(
    "pages/ProviderPromotions.tsx",
    [IMP],
    HOOK,
    [
        ("value: `N$${(promoAnalytics.totals.spend_cents / 100).toLocaleString()}`,", "value: format(promoAnalytics.totals.spend_cents / 100),"),
        ("value: `${promoAnalytics.totals.roi_proxy} / N$100`,", "value: `${promoAnalytics.totals.roi_proxy} / ${format(100)}`,"),
    ],
)
job(
    "pages/TransportAdmin.tsx",
    [IMP],
    HOOK,
    [
        ("{ value: `N$${revenue.toLocaleString()}`, label: 'Revenue', accent: revenue > 0 },", "{ value: format(revenue), label: 'Revenue', accent: revenue > 0 },"),
        ("<strong>N${parseFloat(r.total_price).toLocaleString()}</strong>", "<strong>{format(r.total_price)}</strong>"),
    ],
)
job(
    "pages/StaysAdmin.tsx",
    [IMP],
    HOOK,
    [("{ value: `N$${revenue.toLocaleString()}`, label: 'Revenue', accent: revenue > 0 },", "{ value: format(revenue), label: 'Revenue', accent: revenue > 0 },")],
)
job(
    "pages/GuidesAdmin.tsx",
    [IMP],
    HOOK,
    [("{ value: `N$${revenue.toLocaleString()}`, label: 'Revenue', accent: revenue > 0 },", "{ value: format(revenue), label: 'Revenue', accent: revenue > 0 },")],
)
job(
    "pages/PlatformAdminBookings.tsx",
    [IMP],
    HOOK,
    [
        ("{ value: `N$${stats.revenue.toLocaleString()}`, label: 'Paid volume' },", "{ value: format(stats.revenue), label: 'Paid volume' },"),
        ("{b.amount ? `N$${b.amount.toLocaleString()}` : '—'}", "{b.amount ? format(b.amount) : '—'}"),
    ],
)
job(
    "pages/PlatformAdmin.tsx",
    [IMP],
    HOOK,
    [("{ value: `N$${DEMO_ANALYTICS.revenueMonth.toLocaleString()}`, label: 'Revenue (demo)' },", "{ value: format(DEMO_ANALYTICS.revenueMonth), label: 'Revenue (demo)' },")],
)
job(
    "pages/Transport.tsx",
    [IMP],
    HOOK_CUR,
    [("<span>Price / day (N$)</span>", "<span>Price / day ({currency})</span>")],
)


def main():
    changed = []
    for path, imports, hook, reps, fns in JOBS:
        p = ROOT / path
        if not p.exists():
            print("MISSING", path)
            continue
        text = p.read_text(encoding="utf-8")
        original = text
        depth = path.count("/")
        prefix = "../" * depth
        resolved = []
        for imp in imports:
            resolved.append(imp.replace("{rel}/", prefix))
        text = add_imports(text, resolved)
        if hook:
            text = add_hook(text, fns, hook)
        for a, b in reps:
            text = text.replace(a, b)
        if text != original:
            p.write_text(text, encoding="utf-8", newline="\n")
            changed.append(path)
            print("updated", path)
        else:
            print("unchanged", path)
    print(f"\n{len(changed)} changed")


if __name__ == "__main__":
    main()
