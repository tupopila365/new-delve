"""One-shot migration: replace hardcoded N$ money displays with formatDisplayMoney / useDisplayMoney."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "src"


def ensure_import(text: str, import_line: str) -> str:
    if import_line in text:
        return text
    # Insert after last import block line
    lines = text.splitlines(keepends=True)
    last_import = -1
    for i, line in enumerate(lines):
        if line.startswith("import ") or line.startswith("from "):
            last_import = i
        elif last_import >= 0 and line.strip() and not line.startswith(" ") and not line.startswith("\t"):
            # first non-import after imports
            break
    if last_import < 0:
        return import_line + "\n" + text
    lines.insert(last_import + 1, import_line + "\n")
    return "".join(lines)


def add_hook_after_export(text: str, export_pat: str, hook_line: str = "  const { format } = useDisplayMoney()\n") -> str:
    if "useDisplayMoney()" in text:
        return text
    m = re.search(export_pat, text)
    if not m:
        return text
    # Insert after opening of function, after first few const lines if possible —
    # simply after the function signature line + '{'
    idx = m.end()
    # find next newline after {
    brace = text.find("{", idx)
    if brace < 0:
        return text
    insert_at = text.find("\n", brace) + 1
    return text[:insert_at] + hook_line + text[insert_at:]


def rel_to_hooks(path: Path) -> str:
    depth = len(path.relative_to(ROOT).parts) - 1
    return "../" * depth + "hooks/useDisplayMoney"


def rel_to_display(path: Path) -> str:
    depth = len(path.relative_to(ROOT).parts) - 1
    return "../" * depth + "lib/displayMoney"


def rel_to_explore(path: Path) -> str:
    depth = len(path.relative_to(ROOT).parts) - 1
    return "../" * depth + "lib/exploreDestination"


def patch_file(path: Path, transforms: list) -> bool:
    original = path.read_text(encoding="utf-8")
    text = original
    for fn in transforms:
        text = fn(text, path)
    if text != original:
        path.write_text(text, encoding="utf-8", newline="\n")
        return True
    return False


# --- specific file transforms ---

def t_accommodation_book(text: str, path: Path) -> str:
    text = ensure_import(text, f"import {{ useDisplayMoney }} from '{rel_to_hooks(path)}'")
    text = add_hook_after_export(text, r"export function AccommodationBook\(\) \{")
    reps = [
        ("`N$${displayTotal}`", "format(displayTotal)"),
        ("`N$${rateLabel}`", "format(rateLabel)"),
        ("`N$${booking.total_price}`", "format(booking.total_price)"),
        (
            "`N$${nightlyRate.toFixed(2)} × ${activeNights} ${activeNights === 1 ? 'night' : 'nights'}`",
            "`${format(nightlyRate)} × ${activeNights} ${activeNights === 1 ? 'night' : 'nights'}`",
        ),
        ("`N$${estimatedTotal}`", "format(estimatedTotal)"),
    ]
    for a, b in reps:
        text = text.replace(a, b)
    return text


def t_user_dashboard(text: str, path: Path) -> str:
    text = ensure_import(text, f"import {{ useDisplayMoney }} from '{rel_to_hooks(path)}'")
    text = add_hook_after_export(text, r"export function UserDashboard\(\) \{")
    text = text.replace(
        "price: b.total_price ? `N$${b.total_price}` : undefined,",
        "price: b.total_price ? format(b.total_price) : undefined,",
    )
    text = text.replace(
        "price={b.total_price ? `N$${b.total_price}` : undefined}",
        "price={b.total_price ? format(b.total_price) : undefined}",
    )
    text = text.replace(
        "<span>From N${stay.price_per_night} / night</span>",
        "<span>{format(stay.price_per_night, { suffix: '/night', from: true })}</span>",
    )
    text = text.replace(
        "{guide.hourly_rate ? `From N$${guide.hourly_rate} / hr` : 'Rates on profile'}",
        "{guide.hourly_rate ? format(guide.hourly_rate, { suffix: '/hr', from: true }) : 'Rates on profile'}",
    )
    return text


def t_bus_trip_detail(text: str, path: Path) -> str:
    text = ensure_import(text, f"import {{ useDisplayMoney }} from '{rel_to_hooks(path)}'")
    text = add_hook_after_export(text, r"export function BusTripDetail\(\) \{")
    text = text.replace(
        "const amount = totalPrice ? `N$${totalPrice}` : undefined",
        "const amount = totalPrice ? format(totalPrice) : undefined",
    )
    return text


def t_vehicle_detail(text: str, path: Path) -> str:
    text = ensure_import(text, f"import {{ useDisplayMoney }} from '{rel_to_hooks(path)}'")
    text = add_hook_after_export(text, r"export function VehicleDetail\(\) \{")
    text = text.replace(
        "amountLabel: `N$${booking.total_price}`,",
        "amountLabel: format(booking.total_price),",
    )
    return text


def t_trips_list(text: str, path: Path) -> str:
    text = ensure_import(text, f"import {{ useDisplayMoney }} from '{rel_to_hooks(path)}'")
    text = ensure_import(text, f"import {{ formatDisplayMoney }} from '{rel_to_display(path)}'")
    # Replace static BUDGET_BUCKETS labels with factory using currency at runtime — keep amounts, build labels in component
    text = text.replace(
        """const BUDGET_BUCKETS = [
  { label: 'Under N$2k', min: 0, max: 2000 },
  { label: 'N$2–5k', min: 2000, max: 5000 },
  { label: 'N$5–12k', min: 5000, max: 12000 },
  { label: 'N$12k+', min: 12000, max: Infinity },
]""",
        """const BUDGET_BUCKET_DEFS = [
  { min: 0, max: 2000, kind: 'under' as const },
  { min: 2000, max: 5000, kind: 'range' as const },
  { min: 5000, max: 12000, kind: 'range' as const },
  { min: 12000, max: Infinity, kind: 'plus' as const },
]

function budgetBucketLabel(currency: string, min: number, max: number, kind: 'under' | 'range' | 'plus') {
  const short = (n: number) => formatDisplayMoney(n >= 1000 ? n / 1000 : n, currency).replace(/\\.00$/, '') + (n >= 1000 ? 'k' : '')
  // Prefer compact k labels with symbol from formatter base
  const symAmt = (n: number) => {
    const full = formatDisplayMoney(n, currency)
    if (n >= 1000 && n % 1000 === 0) {
      const base = formatDisplayMoney(n / 1000, currency)
      return `${base}k`
    }
    return full
  }
  if (kind === 'under') return `Under ${symAmt(max)}`
  if (kind === 'plus') return `${symAmt(min)}+`
  return `${symAmt(min)}–${symAmt(max).replace(/^[^0-9]+/, '')}`
}""",
    )
    # Need component to use BUDGET_BUCKETS from defs — find TripsList and add
    if "export function TripsList" in text and "useDisplayMoney()" not in text.split("export function TripsList")[1][:800]:
        text = add_hook_after_export(text, r"export function TripsList\(\) \{", "  const { currency, format } = useDisplayMoney()\n")
    text = text.replace(
        'sub="Full cost breakdowns under N$5k."',
        'sub={`Full cost breakdowns under ${format(5000)}.`}',
    )
    # Replace usages of BUDGET_BUCKETS — if still referenced
    if "BUDGET_BUCKETS" in text and "BUDGET_BUCKET_DEFS" in text:
        # add derived buckets near top of component after hook
        if "const BUDGET_BUCKETS =" not in text.split("export function TripsList")[1][:1200]:
            text = text.replace(
                "  const { currency, format } = useDisplayMoney()\n",
                "  const { currency, format } = useDisplayMoney()\n"
                "  const BUDGET_BUCKETS = BUDGET_BUCKET_DEFS.map((b) => ({\n"
                "    ...b,\n"
                "    label: budgetBucketLabel(currency, b.min, b.max, b.kind),\n"
                "  }))\n",
            )
    return text


def t_booking_room_card(text: str, path: Path) -> str:
    text = ensure_import(text, f"import {{ useDisplayMoney }} from '{rel_to_hooks(path)}'")
    text = add_hook_after_export(text, r"export function BookingRoomCard\(\{ room, className = '' \}: Props\) \{")
    text = text.replace("N${price} / night", "{format(price, { suffix: '/night' })}")
    return text


def t_stay_avail(text: str, path: Path) -> str:
    text = ensure_import(text, f"import {{ useDisplayMoney }} from '{rel_to_hooks(path)}'")
    # Find export function
    m = re.search(r"export function StayAvailabilityPanel\([^)]*\) \{", text)
    if m and "useDisplayMoney()" not in text:
        brace = text.find("{", m.start())
        insert_at = text.find("\n", brace) + 1
        text = text[:insert_at] + "  const { format } = useDisplayMoney()\n" + text[insert_at:]
    text = text.replace("<span>N${estimatedTotal}</span>", "<span>{format(estimatedTotal)}</span>")
    return text


def t_listing_room_picker(text: str, path: Path) -> str:
    text = ensure_import(text, f"import {{ useDisplayMoney }} from '{rel_to_hooks(path)}'")
    text = ensure_import(text, f"import {{ formatDisplayMoney }} from '{rel_to_display(path)}'")
    text = ensure_import(text, f"import {{ exploreDisplayCurrency }} from '{rel_to_explore(path)}'")
    text = text.replace(
        """function displayPrice(room: ListingRoomOption): string | null {
  const price = room.pricePerNight?.trim() || room.fallbackPrice?.trim()
  return price ? `N$${price}` : null
}""",
        """function displayPrice(room: ListingRoomOption, currency: string): string | null {
  const price = room.pricePerNight?.trim() || room.fallbackPrice?.trim()
  return price ? formatDisplayMoney(price, currency) : null
}""",
    )
    text = add_hook_after_export(
        text,
        r"export function ListingRoomPicker\(\{",
        "  const { currency } = useDisplayMoney()\n",
    )
    # Fix broken insert if export has multiline params — handle manually if needed
    text = text.replace("displayPrice(room)", "displayPrice(room, currency)")
    text = text.replace(
        "const compareAt = room.compareAtPrice?.trim() ? `N$${room.compareAtPrice.trim()}` : null",
        "const compareAt = room.compareAtPrice?.trim() ? formatDisplayMoney(room.compareAtPrice.trim(), currency) : null",
    )
    return text


def t_stay_room_picker(text: str, path: Path) -> str:
    text = ensure_import(text, f"import {{ useDisplayMoney }} from '{rel_to_hooks(path)}'")
    text = ensure_import(text, f"import {{ formatDisplayMoney }} from '{rel_to_display(path)}'")
    text = text.replace(
        """function displayPrice(room: ListingRoomOption): string | null {
  const price = room.pricePerNight?.trim() || room.fallbackPrice?.trim()
  return price ? `N$${price}` : null
}""",
        """function displayPrice(room: ListingRoomOption, currency: string): string | null {
  const price = room.pricePerNight?.trim() || room.fallbackPrice?.trim()
  return price ? formatDisplayMoney(price, currency) : null
}""",
    )
    if "useDisplayMoney()" not in text:
        m = re.search(r"export function StayRoomPicker\(", text)
        if m:
            brace = text.find("{", m.start())
            # StayRoomPicker may destructure props on multiple lines
            depth = 0
            i = brace
            while i < len(text):
                if text[i] == "{":
                    depth += 1
                elif text[i] == "}":
                    depth -= 1
                    if depth == 0:
                        # find body {
                        body = text.find("{", i + 1)
                        insert_at = text.find("\n", body) + 1
                        text = text[:insert_at] + "  const { currency } = useDisplayMoney()\n" + text[insert_at:]
                        break
                i += 1
    text = text.replace("displayPrice(room)", "displayPrice(room, currency)")
    text = text.replace(
        "const compareAt = room.compareAtPrice?.trim() ? `N$${room.compareAtPrice.trim()}` : null",
        "const compareAt = room.compareAtPrice?.trim() ? formatDisplayMoney(room.compareAtPrice.trim(), currency) : null",
    )
    return text


def simple_react_n_dollar(
    export_re: str,
    replacements: list[tuple[str, str]],
    hook: str = "  const { format } = useDisplayMoney()\n",
    also_currency: bool = False,
):
    def transform(text: str, path: Path) -> str:
        text = ensure_import(text, f"import {{ useDisplayMoney }} from '{rel_to_hooks(path)}'")
        if also_currency:
            h = "  const { format, currency } = useDisplayMoney()\n"
        else:
            h = hook
        if "useDisplayMoney()" not in text:
            m = re.search(export_re, text)
            if m:
                brace = text.find("{", m.start())
                # for multiline destructuring, walk to matching close of params then body
                if text[m.end() - 1] != "{":
                    # export function Foo( — find ) { 
                    paren = text.find("(", m.start())
                    depth = 0
                    i = paren
                    while i < len(text):
                        if text[i] == "(":
                            depth += 1
                        elif text[i] == ")":
                            depth -= 1
                            if depth == 0:
                                brace = text.find("{", i)
                                break
                        i += 1
                insert_at = text.find("\n", brace) + 1
                text = text[:insert_at] + h + text[insert_at:]
        for a, b in replacements:
            text = text.replace(a, b)
        return text

    return transform


def util_format(replacements: list[tuple[str, str]]):
    def transform(text: str, path: Path) -> str:
        text = ensure_import(text, f"import {{ formatDisplayMoney }} from '{rel_to_display(path)}'")
        text = ensure_import(text, f"import {{ exploreDisplayCurrency }} from '{rel_to_explore(path)}'")
        for a, b in replacements:
            text = text.replace(a, b)
        return text

    return transform


FILES: dict[str, list] = {
    "pages/AccommodationBook.tsx": [t_accommodation_book],
    "pages/UserDashboard.tsx": [t_user_dashboard],
    "pages/BusTripDetail.tsx": [t_bus_trip_detail],
    "pages/VehicleDetail.tsx": [t_vehicle_detail],
    "pages/TripsList.tsx": [t_trips_list],
    "components/booking/BookingRoomCard.tsx": [t_booking_room_card],
    "components/booking/stay/StayAvailabilityPanel.tsx": [t_stay_avail],
    "components/listing/ListingRoomPicker.tsx": [t_listing_room_picker],
    "components/accommodation/StayRoomPicker.tsx": [t_stay_room_picker],
    "components/accommodation/AccommodationRoomBooking.tsx": [
        simple_react_n_dollar(
            r"export function AccommodationRoomBooking\(",
            [
                ('<span className="acc-room-booking__was">N${pricing.compareAt}</span>', '<span className="acc-room-booking__was">{format(pricing.compareAt)}</span>'),
                ('<span className="acc-room-booking__now">N${pricing.price}</span>', '<span className="acc-room-booking__now">{format(pricing.price)}</span>'),
                ("N${pricing.price} × {nights} {nights === 1 ? 'night' : 'nights'}", "{format(pricing.price)} × {nights} {nights === 1 ? 'night' : 'nights'}"),
                ("<span>N${total}</span>", "<span>{format(total)}</span>"),
                ("<strong>N${total}</strong>", "<strong>{format(total)}</strong>"),
            ],
        )
    ],
    "components/accommodation/AccommodationRoomDetailView.tsx": [
        simple_react_n_dollar(
            r"export function AccommodationRoomDetailView\(",
            [
                ("N${nightly} / night", "{format(nightly, { suffix: '/night' })}"),
                ("{nightly ? `N$${nightly}` : listingTitle}", "{nightly ? format(nightly) : listingTitle}"),
            ],
        )
    ],
    "components/booking/transport/BusTripReserveCard.tsx": [
        simple_react_n_dollar(
            r"export function BusTripReserveCard\(",
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
    ],
    "components/booking/transport/VehicleReserveCard.tsx": [
        simple_react_n_dollar(
            r"export function VehicleReserveCard\(",
            [
                ("N${vehicle.price_per_day}", "{format(vehicle.price_per_day)}"),
                ("<strong>N${estimatedTotal}</strong>", "<strong>{format(estimatedTotal)}</strong>"),
                ("<strong>N${vehicle.price_per_day}</strong>", "<strong>{format(vehicle.price_per_day)}</strong>"),
                ("Estimated total: <strong>N${booking.total_price}</strong>", "Estimated total: <strong>{format(booking.total_price)}</strong>"),
                ("Total: <strong>N${booking.total_price}</strong>", "Total: <strong>{format(booking.total_price)}</strong>"),
            ],
        )
    ],
    "components/transport/BusTripDetailView.tsx": [
        simple_react_n_dollar(
            r"export function BusTripDetailView\(",
            [
                (
                    """    ? `N$${Number(booking.group.total_price).toFixed(0)}`
    : booking?.totalPrice
      ? `N$${booking.totalPrice}`
      : `N$${trip.price}`""",
                    """    ? format(Number(booking.group.total_price))
    : booking?.totalPrice
      ? format(booking.totalPrice)
      : format(trip.price)""",
                ),
                ("N${trip.price}/seat", "{format(trip.price, { suffix: '/seat' })}"),
                ('<span className="jd-mobilebar__title">N${trip.price}/seat</span>', '<span className="jd-mobilebar__title">{format(trip.price, { suffix: "/seat" })}</span>'),
            ],
        )
    ],
    "components/transport/VehicleDetailView.tsx": [
        simple_react_n_dollar(
            r"export function VehicleDetailView\(",
            [
                ("N${vehicle.price_per_day}/day", "{format(vehicle.price_per_day, { suffix: '/day' })}"),
                (
                    "{estTotal ? `Est. N$${estTotal}` : `N$${vehicle.price_per_day}/day`}",
                    "{estTotal ? `Est. ${format(estTotal)}` : format(vehicle.price_per_day, { suffix: '/day' })}",
                ),
            ],
        )
    ],
    "components/transport/transportStoriesUtils.ts": [
        util_format(
            [
                ("headline: `N$${vehicle.price_per_day} / day`,", "headline: formatDisplayMoney(vehicle.price_per_day, exploreDisplayCurrency(), { suffix: '/day' }),"),
                ("headline: `N$${trip.price} per passenger`,", "headline: `${formatDisplayMoney(trip.price, exploreDisplayCurrency())} per passenger`,"),
            ]
        )
    ],
    "components/accommodation/stayStoriesUtils.ts": [
        util_format(
            [
                ("headline: `From N$${data.price_per_night} / night`,", "headline: formatDisplayMoney(data.price_per_night, exploreDisplayCurrency(), { suffix: '/night', from: true }),"),
            ]
        )
    ],
    "components/events/EventTicketCard.tsx": [
        simple_react_n_dollar(
            r"export function EventTicketCard\(",
            [
                ("{payPending ? 'Processing…' : `Pay N$${bookingTotal ?? event.price ?? ''} (mock)`}", "{payPending ? 'Processing…' : `Pay ${format(bookingTotal ?? event.price ?? '')} (mock)`}"),
                ("Reserve · N${event.price}", "Reserve · {format(event.price)}"),
                ("N${event.price}", "{format(event.price)}"),
            ],
        )
    ],
    "components/events/EventForm.tsx": [
        simple_react_n_dollar(
            r"export function EventForm\(",
            [
                ("? `N$${state.price || '—'} on DELVE`", "? `${format(state.price) || '—'} on DELVE`"),
            ],
        )
    ],
    "components/events/EventDetailView.tsx": [
        simple_react_n_dollar(
            r"export function EventDetailView\(",
            [
                ("? `Reserve · N$${event.price}`", "? `Reserve · ${format(event.price)}`"),
            ],
        )
    ],
    "components/journeys/JourneyDayByDay.tsx": [
        simple_react_n_dollar(
            r"export function JourneyDayByDay\(",
            [
                ('<span className="jn-diary__cost">N${stop.cost.toLocaleString()}</span>', '<span className="jn-diary__cost">{format(stop.cost)}</span>'),
            ],
        )
    ],
    "components/provider/guides/GuideBookingCard.tsx": [
        simple_react_n_dollar(
            r"export function GuideBookingCard\(",
            [
                ("<strong>N${parseFloat(booking.total_price).toLocaleString()}</strong>", "<strong>{format(booking.total_price)}</strong>"),
            ],
        )
    ],
    "components/provider/stays/StayBookingCard.tsx": [
        simple_react_n_dollar(
            r"export function StayBookingCard\(",
            [
                ("<strong>N${parseFloat(booking.total_price).toLocaleString()}</strong>", "<strong>{format(booking.total_price)}</strong>"),
            ],
        )
    ],
    "components/provider/stays/StayListingCard.tsx": [
        simple_react_n_dollar(
            r"export function StayListingCard\(",
            [
                (
                    "{stay.city}, {stay.region} · N${stay.price_per_night}/night · {stay.max_guests} guests · {stay.bedrooms}{' '}",
                    "{stay.city}, {stay.region} · {format(stay.price_per_night, { suffix: '/night' })} · {stay.max_guests} guests · {stay.bedrooms}{' '}",
                ),
            ],
        )
    ],
    "components/provider/transport/BusTripListingCard.tsx": [
        simple_react_n_dollar(
            r"export function BusTripListingCard\(",
            [
                (
                    "{fmtWhen(trip.departs_at)} · N${trip.price}/passenger · {trip.total_seats} seats",
                    "{fmtWhen(trip.departs_at)} · {format(trip.price, { suffix: '/passenger' })} · {trip.total_seats} seats",
                ),
            ],
        )
    ],
    "components/provider/transport/VehicleListingCard.tsx": [
        simple_react_n_dollar(
            r"export function VehicleListingCard\(",
            [
                (
                    "{vehicle.city}, {vehicle.region} · N${vehicle.price_per_day}/day",
                    "{vehicle.city}, {vehicle.region} · {format(vehicle.price_per_day, { suffix: '/day' })}",
                ),
            ],
        )
    ],
    "components/provider/guides/GuideProfileSummaryCard.tsx": [
        simple_react_n_dollar(
            r"export function GuideProfileSummaryCard\(",
            [
                ("{guide.hourly_rate ? <span>N${guide.hourly_rate}/hr</span> : null}", "{guide.hourly_rate ? <span>{format(guide.hourly_rate, { suffix: '/hr' })}</span> : null}"),
            ],
        )
    ],
    "components/provider/guides/GuidePackageCard.tsx": [
        simple_react_n_dollar(
            r"export function GuidePackageCard\(",
            [
                ("{pkg.hours}h · N${pkg.price} per person", "{pkg.hours}h · {format(pkg.price)} per person"),
            ],
        )
    ],
    "components/provider/guides/GuideMonetizationSection.tsx": [
        util_format(
            [
                (
                    """  if (!Number.isFinite(n) || n <= 0) return 'N$0'
  return `N$${n.toLocaleString('en-NA', { maximumFractionDigits: 0 })}`""",
                    """  if (!Number.isFinite(n) || n <= 0) return formatDisplayMoney(0, exploreDisplayCurrency())
  return formatDisplayMoney(n, exploreDisplayCurrency())""",
                ),
            ]
        )
    ],
    "pages/Transport.tsx": [
        simple_react_n_dollar(
            r"export function Transport\(",
            [
                ("<span>Price / day (N$)</span>", "<span>Price / day ({currency})</span>"),
            ],
            also_currency=True,
        )
    ],
    "pages/ProviderBookings.tsx": [
        simple_react_n_dollar(
            r"export function ProviderBookings\(",
            [
                ("{ value: `N$${stats.revenue.toLocaleString()}`, label: 'Revenue' },", "{ value: format(stats.revenue), label: 'Revenue' },"),
            ],
        )
    ],
    "pages/ProviderPromotions.tsx": [
        simple_react_n_dollar(
            r"export function ProviderPromotions\(",
            [
                (
                    "value: `N$${(promoAnalytics.totals.spend_cents / 100).toLocaleString()}`,",
                    "value: format(promoAnalytics.totals.spend_cents / 100),",
                ),
                (
                    "value: `${promoAnalytics.totals.roi_proxy} / N$100`,",
                    "value: `${promoAnalytics.totals.roi_proxy} / ${format(100)}`,",
                ),
            ],
        )
    ],
    "pages/TransportAdmin.tsx": [
        simple_react_n_dollar(
            r"export function TransportAdmin\(",
            [
                ("{ value: `N$${revenue.toLocaleString()}`, label: 'Revenue', accent: revenue > 0 },", "{ value: format(revenue), label: 'Revenue', accent: revenue > 0 },"),
                ("<strong>N${parseFloat(r.total_price).toLocaleString()}</strong>", "<strong>{format(r.total_price)}</strong>"),
            ],
        )
    ],
    "pages/StaysAdmin.tsx": [
        simple_react_n_dollar(
            r"export function StaysAdmin\(",
            [
                ("{ value: `N$${revenue.toLocaleString()}`, label: 'Revenue', accent: revenue > 0 },", "{ value: format(revenue), label: 'Revenue', accent: revenue > 0 },"),
            ],
        )
    ],
    "pages/GuidesAdmin.tsx": [
        simple_react_n_dollar(
            r"export function GuidesAdmin\(",
            [
                ("{ value: `N$${revenue.toLocaleString()}`, label: 'Revenue', accent: revenue > 0 },", "{ value: format(revenue), label: 'Revenue', accent: revenue > 0 },"),
            ],
        )
    ],
    "pages/PlatformAdminBookings.tsx": [
        simple_react_n_dollar(
            r"export function PlatformAdminBookings\(",
            [
                ("{ value: `N$${stats.revenue.toLocaleString()}`, label: 'Paid volume' },", "{ value: format(stats.revenue), label: 'Paid volume' },"),
                ("{b.amount ? `N$${b.amount.toLocaleString()}` : '—'}", "{b.amount ? format(b.amount) : '—'}"),
            ],
        )
    ],
    "components/provider/guides/GuideProfileForm.tsx": [
        simple_react_n_dollar(
            r"export function GuideProfileForm\(",
            [
                ("Hourly rate (N$)", "Hourly rate ({currency})"),
            ],
            also_currency=True,
        )
    ],
    "components/provider/guides/GuidePackageForm.tsx": [
        simple_react_n_dollar(
            r"export function GuidePackageForm\(",
            [
                ("Price per person (N$)", "Price per person ({currency})"),
            ],
            also_currency=True,
        )
    ],
    "components/provider/transport/BusTripListingForm.tsx": [
        simple_react_n_dollar(
            r"export function BusTripListingForm\(",
            [
                ("Fare per passenger (N$)", "Fare per passenger ({currency})"),
            ],
            also_currency=True,
        )
    ],
    "components/provider/transport/VehicleListingForm.tsx": [
        simple_react_n_dollar(
            r"export function VehicleListingForm\(",
            [
                ("Daily rate (N$)", "Daily rate ({currency})"),
            ],
            also_currency=True,
        )
    ],
    "components/provider/stays/StayListingForm.tsx": [
        simple_react_n_dollar(
            r"export function StayListingForm\(",
            [
                ("<span>From price per night (N$)</span>", "<span>From price per night ({currency})</span>"),
                ("<span>Price / night (N$)</span>", "<span>Price / night ({currency})</span>"),
                ("<span>Compare-at price (N$)</span>", "<span>Compare-at price ({currency})</span>"),
            ],
            also_currency=True,
        )
    ],
    "components/journeys/JourneyForm.tsx": [
        simple_react_n_dollar(
            r"export function JourneyForm\(",
            [
                ('placeholder="N$ 0"', 'placeholder={`${symbol} 0`}'),
                ('<span className="cj-cost-row__currency">N$</span>', '<span className="cj-cost-row__currency">{symbol}</span>'),
                ("<strong>N${total.toLocaleString()}</strong>", "<strong>{format(total)}</strong>"),
                ("{total > 0 && ` · N$${total.toLocaleString()}`}", "{total > 0 && ` · ${format(total)}`}"),
            ],
            hook="  const { format, symbol } = useDisplayMoney()\n",
        )
    ],
}


def main():
    changed = []
    for rel, transforms in FILES.items():
        path = ROOT / rel
        if not path.exists():
            print("MISSING", rel)
            continue
        if patch_file(path, transforms):
            changed.append(rel)
            print("updated", rel)
        else:
            print("unchanged", rel)
    print(f"\n{len(changed)} files changed")


if __name__ == "__main__":
    main()
