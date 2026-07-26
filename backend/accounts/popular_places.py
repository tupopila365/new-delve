"""Usage-based Explore place recommendations (listings, bookings, engagement)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from accounts.models import ExplorePlacePin, PlaceSignal, PlaceSignalKind, PopularPlace

LISTING_WEIGHT = 3
BOOKING_WEIGHT = 5
CHIP_CLICK_WEIGHT = 2
SEARCH_WEIGHT = 1
NEAR_POINT_WEIGHT = 1
BOOKING_LOOKBACK_DAYS = 90
SIGNAL_LOOKBACK_DAYS = 7
DEFAULT_LIMIT = 6
MAX_CACHE_PER_COUNTRY = 12
MAX_LABEL_LEN = 120
MAX_EXPLORE_PLACE_PINS = 2

# Town centres used for lat/lng when listing geo is missing (mirrors frontend presets).
TOWN_CENTRES_BY_COUNTRY: dict[str, list[dict]] = {
    "NA": [
        {"label": "Windhoek", "latitude": -22.5609, "longitude": 17.0658, "region": "Khomas"},
        {"label": "Swakopmund", "latitude": -22.6783, "longitude": 14.5261, "region": "Erongo"},
        {"label": "Walvis Bay", "latitude": -22.9575, "longitude": 14.5053, "region": "Erongo"},
        {"label": "Lüderitz", "latitude": -26.6481, "longitude": 15.1539, "region": "Karas"},
        {"label": "Ongwediva", "latitude": -17.7833, "longitude": 15.7667, "region": "Oshana"},
        {"label": "Etosha", "latitude": -18.8556, "longitude": 16.3297, "region": "Oshikoto"},
        {"label": "Sossusvlei", "latitude": -24.7278, "longitude": 15.3075, "region": "Hardap"},
    ],
    "ZA": [
        {"label": "Cape Town", "latitude": -33.9249, "longitude": 18.4241, "region": "Western Cape"},
        {"label": "Johannesburg", "latitude": -26.2041, "longitude": 28.0473, "region": "Gauteng"},
        {"label": "Durban", "latitude": -29.8587, "longitude": 31.0218, "region": "KwaZulu-Natal"},
        {"label": "Pretoria", "latitude": -25.7479, "longitude": 28.2293, "region": "Gauteng"},
        {"label": "Stellenbosch", "latitude": -33.9321, "longitude": 18.8602, "region": "Western Cape"},
    ],
    "BW": [
        {"label": "Gaborone", "latitude": -24.6282, "longitude": 25.9231, "region": "South-East"},
        {"label": "Maun", "latitude": -19.9833, "longitude": 23.4167, "region": "North-West"},
        {"label": "Kasane", "latitude": -17.8167, "longitude": 25.15, "region": "Chobe"},
    ],
    "KE": [
        {"label": "Nairobi", "latitude": -1.2921, "longitude": 36.8219, "region": "Nairobi"},
        {"label": "Mombasa", "latitude": -4.0435, "longitude": 39.6682, "region": "Coast"},
        {"label": "Kisumu", "latitude": -0.0917, "longitude": 34.768, "region": "Nyanza"},
    ],
    "TZ": [
        {"label": "Dar es Salaam", "latitude": -6.7924, "longitude": 39.2083, "region": "Dar es Salaam"},
        {"label": "Arusha", "latitude": -3.3869, "longitude": 36.683, "region": "Arusha"},
        {"label": "Zanzibar", "latitude": -6.1659, "longitude": 39.2026, "region": "Zanzibar"},
    ],
    "ZM": [
        {"label": "Lusaka", "latitude": -15.3875, "longitude": 28.3228, "region": "Lusaka"},
        {"label": "Livingstone", "latitude": -17.8419, "longitude": 25.8543, "region": "Southern"},
    ],
    "MZ": [
        {"label": "Maputo", "latitude": -25.9692, "longitude": 32.5732, "region": "Maputo"},
        {"label": "Beira", "latitude": -19.8333, "longitude": 34.85, "region": "Sofala"},
    ],
    "AO": [
        {"label": "Luanda", "latitude": -8.839, "longitude": 13.2894, "region": "Luanda"},
        {"label": "Benguela", "latitude": -12.5763, "longitude": 13.4055, "region": "Benguela"},
    ],
    "NG": [
        {"label": "Lagos", "latitude": 6.5244, "longitude": 3.3792, "region": "Lagos"},
        {"label": "Abuja", "latitude": 9.0765, "longitude": 7.3986, "region": "Abuja"},
    ],
    "GH": [
        {"label": "Accra", "latitude": 5.6037, "longitude": -0.187, "region": "Greater Accra"},
        {"label": "Kumasi", "latitude": 6.6885, "longitude": -1.6244, "region": "Ashanti"},
    ],
    "US": [
        {"label": "New York", "latitude": 40.7128, "longitude": -74.006, "region": "New York"},
        {"label": "Los Angeles", "latitude": 34.0522, "longitude": -118.2437, "region": "California"},
        {"label": "Miami", "latitude": 25.7617, "longitude": -80.1918, "region": "Florida"},
    ],
    "GB": [
        {"label": "London", "latitude": 51.5074, "longitude": -0.1278, "region": "England"},
        {"label": "Edinburgh", "latitude": 55.9533, "longitude": -3.1883, "region": "Scotland"},
        {"label": "Manchester", "latitude": 53.4808, "longitude": -2.2426, "region": "England"},
    ],
    "DE": [
        {"label": "Berlin", "latitude": 52.52, "longitude": 13.405, "region": "Berlin"},
        {"label": "Munich", "latitude": 48.1351, "longitude": 11.582, "region": "Bavaria"},
    ],
    "FR": [
        {"label": "Paris", "latitude": 48.8566, "longitude": 2.3522, "region": "Île-de-France"},
        {"label": "Nice", "latitude": 43.7102, "longitude": 7.262, "region": "Provence-Alpes-Côte d'Azur"},
    ],
    "AU": [
        {"label": "Sydney", "latitude": -33.8688, "longitude": 151.2093, "region": "New South Wales"},
        {"label": "Melbourne", "latitude": -37.8136, "longitude": 144.9631, "region": "Victoria"},
        {"label": "Brisbane", "latitude": -27.4698, "longitude": 153.0251, "region": "Queensland"},
    ],
}


@dataclass
class _PlaceAgg:
    label: str
    region: str = ""
    listing_count: int = 0
    booking_count: int = 0
    chip_clicks: int = 0
    searches: int = 0
    near_points: int = 0
    lat_sum: float = 0.0
    lng_sum: float = 0.0
    geo_n: int = 0

    @property
    def score(self) -> int:
        return (
            self.listing_count * LISTING_WEIGHT
            + self.booking_count * BOOKING_WEIGHT
            + self.chip_clicks * CHIP_CLICK_WEIGHT
            + self.searches * SEARCH_WEIGHT
            + self.near_points * NEAR_POINT_WEIGHT
        )


def _norm_key(label: str) -> str:
    return " ".join((label or "").strip().lower().split())


def _preset_index(country: str) -> dict[str, dict]:
    return {_norm_key(row["label"]): row for row in TOWN_CENTRES_BY_COUNTRY.get(country, [])}


def _bump(
    bag: dict[str, _PlaceAgg],
    *,
    label: str,
    region: str = "",
    listings: int = 0,
    bookings: int = 0,
    chip_clicks: int = 0,
    searches: int = 0,
    near_points: int = 0,
    lat=None,
    lng=None,
) -> None:
    key = _norm_key(label)
    if not key:
        return
    row = bag.get(key)
    if row is None:
        # Prefer canonical casing from first sighting.
        row = _PlaceAgg(label=(label or "").strip()[:MAX_LABEL_LEN], region=(region or "").strip())
        bag[key] = row
    elif region and not row.region:
        row.region = region.strip()
    row.listing_count += listings
    row.booking_count += bookings
    row.chip_clicks += chip_clicks
    row.searches += searches
    row.near_points += near_points
    if lat is not None and lng is not None:
        try:
            la = float(lat)
            lo = float(lng)
        except (TypeError, ValueError):
            return
        if abs(la) <= 90 and abs(lo) <= 180:
            row.lat_sum += la
            row.lng_sum += lo
            row.geo_n += 1


def _resolve_coords(agg: _PlaceAgg, presets: dict[str, dict]) -> tuple[Decimal, Decimal, str] | None:
    key = _norm_key(agg.label)
    preset = presets.get(key)
    if preset:
        return (
            Decimal(str(preset["latitude"])),
            Decimal(str(preset["longitude"])),
            (preset.get("region") or agg.region or "").strip(),
        )
    if agg.geo_n > 0:
        return (
            Decimal(str(round(agg.lat_sum / agg.geo_n, 6))),
            Decimal(str(round(agg.lng_sum / agg.geo_n, 6))),
            agg.region,
        )
    return None


def _collect_activity(country: str) -> dict[str, _PlaceAgg]:
    from accommodation.models import AccommodationBooking, AccommodationListing
    from events_app.models import Event, EventBooking
    from food.models import FoodReservation, FoodVenue
    from transport.models import BusRoute, SeatReservation, VehicleRentalBooking, VehicleRentalListing

    bag: dict[str, _PlaceAgg] = {}
    cc = country.upper()
    since = timezone.now() - timedelta(days=BOOKING_LOOKBACK_DAYS)

    for listing in AccommodationListing.objects.filter(is_active=True, country_code__iexact=cc).only(
        "city", "region", "latitude", "longitude"
    ):
        label = (listing.city or listing.region or "").strip()
        _bump(
            bag,
            label=label,
            region=listing.region or "",
            listings=1,
            lat=listing.latitude,
            lng=listing.longitude,
        )

    for venue in FoodVenue.objects.filter(is_active=True, country_code__iexact=cc).only(
        "city", "region", "latitude", "longitude"
    ):
        label = (venue.city or venue.region or "").strip()
        _bump(
            bag,
            label=label,
            region=venue.region or "",
            listings=1,
            lat=venue.latitude,
            lng=venue.longitude,
        )

    for event in Event.objects.filter(is_published=True, country_code__iexact=cc).only("city", "region"):
        label = (event.city or event.region or "").strip()
        _bump(bag, label=label, region=event.region or "", listings=1)

    for vehicle in VehicleRentalListing.objects.filter(is_active=True, country_code__iexact=cc).only(
        "city", "region"
    ):
        label = (vehicle.city or vehicle.region or "").strip()
        _bump(bag, label=label, region=vehicle.region or "", listings=1)

    for route in BusRoute.objects.filter(operator__country_code__iexact=cc).select_related("operator").only(
        "origin", "destination", "operator__region"
    ):
        region = route.operator.region or ""
        _bump(bag, label=route.origin or "", region=region, listings=1)
        _bump(bag, label=route.destination or "", region=region, listings=1)

    for b in (
        AccommodationBooking.objects.filter(created_at__gte=since, listing__country_code__iexact=cc)
        .select_related("listing")
        .only("listing__city", "listing__region")
    ):
        listing = b.listing
        label = (listing.city or listing.region or "").strip()
        _bump(bag, label=label, region=listing.region or "", bookings=1)

    for r in (
        FoodReservation.objects.filter(created_at__gte=since, venue__country_code__iexact=cc)
        .select_related("venue")
        .only("venue__city", "venue__region")
    ):
        venue = r.venue
        label = (venue.city or venue.region or "").strip()
        _bump(bag, label=label, region=venue.region or "", bookings=1)

    for eb in (
        EventBooking.objects.filter(created_at__gte=since, event__country_code__iexact=cc)
        .select_related("event")
        .only("event__city", "event__region")
    ):
        event = eb.event
        label = (event.city or event.region or "").strip()
        _bump(bag, label=label, region=event.region or "", bookings=1)

    for vb in (
        VehicleRentalBooking.objects.filter(created_at__gte=since, listing__country_code__iexact=cc)
        .select_related("listing")
        .only("listing__city", "listing__region")
    ):
        listing = vb.listing
        label = (listing.city or listing.region or "").strip()
        _bump(bag, label=label, region=listing.region or "", bookings=1)

    for sr in (
        SeatReservation.objects.filter(created_at__gte=since, trip__route__operator__country_code__iexact=cc)
        .select_related("trip__route__operator")
        .only("trip__route__origin", "trip__route__operator__region")
    ):
        route = sr.trip.route
        _bump(bag, label=route.origin or "", region=route.operator.region or "", bookings=1)

    _fold_signals(bag, cc)
    return bag


def _fold_signals(bag: dict[str, _PlaceAgg], country: str) -> None:
    from django.db.models import Count

    since = timezone.now() - timedelta(days=SIGNAL_LOOKBACK_DAYS)
    rows = (
        PlaceSignal.objects.filter(country_code__iexact=country, created_at__gte=since)
        .values("label", "kind")
        .annotate(n=Count("id"))
    )
    for row in rows:
        kind = row["kind"]
        n = int(row["n"] or 0)
        if n <= 0:
            continue
        if kind == PlaceSignalKind.CHIP_CLICK:
            _bump(bag, label=row["label"], chip_clicks=n)
        elif kind == PlaceSignalKind.SEARCH:
            _bump(bag, label=row["label"], searches=n)
        elif kind == PlaceSignalKind.NEAR_POINT:
            _bump(bag, label=row["label"], near_points=n)


def compute_ranked_places(country: str, *, limit: int = MAX_CACHE_PER_COUNTRY) -> list[dict]:
    """Return ranked place dicts with coordinates for a country."""
    cc = (country or "").strip().upper()
    if len(cc) != 2:
        return []

    presets = _preset_index(cc)
    bag = _collect_activity(cc)

    ranked: list[dict] = []
    seen = set()
    for key, agg in sorted(bag.items(), key=lambda kv: (-kv[1].score, kv[1].label.lower())):
        if agg.score <= 0:
            continue
        coords = _resolve_coords(agg, presets)
        if not coords:
            continue
        lat, lng, region = coords
        label = presets.get(key, {}).get("label") or agg.label
        search_total = agg.searches + agg.near_points
        ranked.append(
            {
                "label": label,
                "region": region,
                "latitude": lat,
                "longitude": lng,
                "score": agg.score,
                "listing_count": agg.listing_count,
                "booking_count": agg.booking_count,
                "chip_click_count": agg.chip_clicks,
                "search_count": search_total,
            }
        )
        seen.add(_norm_key(label))
        if len(ranked) >= limit:
            break

    # Pad with presets so sparse countries still get chips.
    for preset in TOWN_CENTRES_BY_COUNTRY.get(cc, []):
        if len(ranked) >= limit:
            break
        key = _norm_key(preset["label"])
        if key in seen:
            continue
        ranked.append(
            {
                "label": preset["label"],
                "region": preset.get("region") or "",
                "latitude": Decimal(str(preset["latitude"])),
                "longitude": Decimal(str(preset["longitude"])),
                "score": 0,
                "listing_count": 0,
                "booking_count": 0,
                "chip_click_count": 0,
                "search_count": 0,
            }
        )
        seen.add(key)

    return ranked


def refresh_popular_places(*, country: str | None = None) -> int:
    """Recompute and replace cached PopularPlace rows. Returns rows written."""
    countries = [country.strip().upper()] if country else sorted(TOWN_CENTRES_BY_COUNTRY.keys())
    written = 0
    for cc in countries:
        if len(cc) != 2:
            continue
        ranked = compute_ranked_places(cc, limit=MAX_CACHE_PER_COUNTRY)
        PopularPlace.objects.filter(country_code=cc).delete()
        for i, row in enumerate(ranked, start=1):
            PopularPlace.objects.create(
                country_code=cc,
                label=row["label"],
                region=row["region"],
                latitude=row["latitude"],
                longitude=row["longitude"],
                score=row["score"],
                listing_count=row["listing_count"],
                booking_count=row["booking_count"],
                chip_click_count=row.get("chip_click_count") or 0,
                search_count=row.get("search_count") or 0,
                rank=i,
            )
            written += 1
    return written


def serialize_place(row: PopularPlace | dict, *, is_pinned: bool = False) -> dict:
    if isinstance(row, PopularPlace):
        return {
            "label": row.label,
            "region": row.region,
            "latitude": float(row.latitude),
            "longitude": float(row.longitude),
            "score": row.score,
            "listing_count": row.listing_count,
            "booking_count": row.booking_count,
            "chip_click_count": row.chip_click_count,
            "search_count": row.search_count,
            "is_pinned": is_pinned,
        }
    return {
        "label": row["label"],
        "region": row.get("region") or "",
        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),
        "score": int(row.get("score") or 0),
        "listing_count": int(row.get("listing_count") or 0),
        "booking_count": int(row.get("booking_count") or 0),
        "chip_click_count": int(row.get("chip_click_count") or 0),
        "search_count": int(row.get("search_count") or 0),
        "is_pinned": bool(row.get("is_pinned", is_pinned)),
    }


def serialize_explore_pin(pin: ExplorePlacePin) -> dict:
    return serialize_place(
        {
            "label": pin.label,
            "region": pin.region or "",
            "latitude": pin.latitude,
            "longitude": pin.longitude,
            "score": 0,
            "listing_count": 0,
            "booking_count": 0,
            "chip_click_count": 0,
            "search_count": 0,
            "is_pinned": True,
        },
        is_pinned=True,
    )


def active_explore_pins(country: str) -> list[ExplorePlacePin]:
    cc = (country or "").strip().upper()
    if len(cc) != 2:
        return []
    return list(
        ExplorePlacePin.objects.filter(country_code=cc, is_active=True).order_by("sort_order", "id")[
            :MAX_EXPLORE_PLACE_PINS
        ]
    )


def resolve_preset_coords(country: str, label: str) -> dict | None:
    """Match a label to a hardcoded town centre for lat/lng/region."""
    cc = (country or "").strip().upper()
    key = _norm_key(label)
    if not key:
        return None
    for row in TOWN_CENTRES_BY_COUNTRY.get(cc, []):
        if _norm_key(row["label"]) == key:
            return row
    return None


def record_place_signal(*, country: str, label: str, kind: str) -> PlaceSignal | None:
    """Persist an anonymous Explore engagement signal. Returns None if invalid."""
    cc = (country or "").strip().upper()
    place = (label or "").strip()[:MAX_LABEL_LEN]
    kind_value = (kind or "").strip().lower()
    if len(cc) != 2 or not place:
        return None
    if kind_value not in {c.value for c in PlaceSignalKind}:
        return None
    # Skip non-place labels
    if place.lower() in {"near me", "your location"}:
        return None
    return PlaceSignal.objects.create(country_code=cc, label=place, kind=kind_value)


def _organic_places(country: str, *, limit: int) -> list[dict]:
    """Cached usage ranking; compute on the fly when empty. No pins."""
    cc = (country or "").strip().upper()
    cached = list(PopularPlace.objects.filter(country_code=cc).order_by("rank", "-score")[:limit])
    if cached:
        return [serialize_place(r) for r in cached]

    refresh_popular_places(country=cc)
    cached = list(PopularPlace.objects.filter(country_code=cc).order_by("rank", "-score")[:limit])
    if cached:
        return [serialize_place(r) for r in cached]

    return [
        serialize_place(
            {
                "label": p["label"],
                "region": p.get("region") or "",
                "latitude": Decimal(str(p["latitude"])),
                "longitude": Decimal(str(p["longitude"])),
                "score": 0,
                "listing_count": 0,
                "booking_count": 0,
                "chip_click_count": 0,
                "search_count": 0,
            }
        )
        for p in TOWN_CENTRES_BY_COUNTRY.get(cc, [])[:limit]
    ]


def recommended_places_for_country(country: str, *, limit: int = DEFAULT_LIMIT) -> list[dict]:
    """Pinned places first, then usage ranking; hardcoded presets as last resort."""
    cc = (country or "").strip().upper()
    limit = max(1, min(int(limit or DEFAULT_LIMIT), MAX_CACHE_PER_COUNTRY))
    if len(cc) != 2:
        return []

    pinned_rows = [serialize_explore_pin(p) for p in active_explore_pins(cc)]
    seen = {_norm_key(p["label"]) for p in pinned_rows}
    out = list(pinned_rows)

    if len(out) >= limit:
        return out[:limit]

    for row in _organic_places(cc, limit=MAX_CACHE_PER_COUNTRY):
        key = _norm_key(row["label"])
        if key in seen:
            continue
        out.append(row)
        seen.add(key)
        if len(out) >= limit:
            break

    if len(out) >= limit:
        return out[:limit]

    # Absolute fallback — presets only for remaining slots.
    for preset in TOWN_CENTRES_BY_COUNTRY.get(cc, []):
        key = _norm_key(preset["label"])
        if key in seen:
            continue
        out.append(
            serialize_place(
                {
                    "label": preset["label"],
                    "region": preset.get("region") or "",
                    "latitude": Decimal(str(preset["latitude"])),
                    "longitude": Decimal(str(preset["longitude"])),
                    "score": 0,
                    "listing_count": 0,
                    "booking_count": 0,
                    "chip_click_count": 0,
                    "search_count": 0,
                }
            )
        )
        seen.add(key)
        if len(out) >= limit:
            break

    return out[:limit]
