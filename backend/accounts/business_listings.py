"""Aggregate listings and public stats for a business profile."""

from __future__ import annotations

from decimal import Decimal

from django.utils import timezone

from accommodation.models import AccommodationListing
from events_app.models import Event
from food.models import FoodVenue
from guides.models import TourGuideProfile
from shop.models import ShopProduct
from transport.models import BusTrip, VehicleRentalListing

from .models import BusinessProfile, BusinessType


def _media_url(request, field) -> str | None:
    if not field:
        return None
    if isinstance(field, str):
        url = field.strip()
        if not url:
            return None
        return _absolute_url(request, url if url.startswith(("/", "http://", "https://")) else f"/media/{url.lstrip('/')}")
    try:
        url = field.url
    except (ValueError, AttributeError):
        return None
    if request is not None:
        return request.build_absolute_uri(url)
    return url


def _absolute_url(request, url: str) -> str:
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if request is not None:
        return request.build_absolute_uri(url)
    return url


def _vehicle_image(request, vehicle: VehicleRentalListing) -> str | None:
    if vehicle.cover_image:
        return _media_url(request, vehicle.cover_image)
    gallery = vehicle.gallery_images or []
    if gallery and isinstance(gallery[0], str) and gallery[0].strip():
        return _absolute_url(request, gallery[0].strip())
    return None


def _bus_route_image(route) -> str | None:
    if route.cover_image:
        return route.cover_image
    gallery = route.gallery_images or []
    if gallery and isinstance(gallery[0], str) and gallery[0].strip():
        return gallery[0].strip()
    return None


def _business_transport_modes(business: BusinessProfile) -> set[str]:
    modes = set(business.transport_modes or [])
    types = business.business_types or []
    if not modes and BusinessType.TRANSPORT in types:
        return {"rental", "shared"}
    return modes


def _format_trip_departure(dt) -> str:
    local = timezone.localtime(dt) if timezone.is_aware(dt) else dt
    return local.strftime("%a %d %b · %H:%M")


def _weighted_rating(pairs: list[tuple[Decimal, int]]) -> tuple[str | None, int]:
    total_count = sum(count for _, count in pairs)
    if total_count <= 0:
        return None, 0
    weighted = sum(avg * count for avg, count in pairs) / total_count
    return str(round(weighted, 1)), total_count


def business_stats(business: BusinessProfile) -> dict:
    owner = business.owner
    rating_pairs: list[tuple[Decimal, int]] = []
    listings_count = 0

    stays = AccommodationListing.objects.filter(owner=owner, is_active=True)
    listings_count += stays.count()
    for row in stays:
        if row.rating_count and row.rating_avg is not None:
            rating_pairs.append((Decimal(row.rating_avg), int(row.rating_count)))

    food = FoodVenue.objects.filter(owner=owner, is_active=True)
    listings_count += food.count()
    for row in food:
        if row.rating_count and row.rating_avg is not None:
            rating_pairs.append((Decimal(row.rating_avg), int(row.rating_count)))

    shop = ShopProduct.objects.filter(owner=owner, is_active=True)
    listings_count += shop.count()

    transport_modes = _business_transport_modes(business)
    if "rental" in transport_modes:
        transport = VehicleRentalListing.objects.filter(owner=owner, is_active=True)
        listings_count += transport.count()

    if "shared" in transport_modes:
        now = timezone.now()
        bus_trips = BusTrip.objects.filter(
            route__operator__owner=owner,
            is_active=True,
            departs_at__gte=now,
        )
        listings_count += bus_trips.count()

    guide = TourGuideProfile.objects.filter(user=owner, is_active=True).first()
    if guide:
        listings_count += 1
        if guide.rating_count and guide.rating_avg is not None:
            rating_pairs.append((Decimal(guide.rating_avg), int(guide.rating_count)))

    events = Event.objects.filter(business=business, is_published=True)
    listings_count += events.count()

    rating_avg, rating_count = _weighted_rating(rating_pairs)
    response_hours = guide.response_hours_typical if guide else None

    return {
        "listings_count": listings_count,
        "rating_avg": rating_avg,
        "rating_count": rating_count,
        "response_hours": response_hours,
    }


def business_listings(business: BusinessProfile, request=None) -> list[dict]:
    owner = business.owner
    items: list[dict] = []
    transport_modes = _business_transport_modes(business)
    now = timezone.now()

    for stay in AccommodationListing.objects.filter(owner=owner, is_active=True).order_by("-created_at"):
        subtitle = stay.city or ""
        if stay.property_type:
            subtitle = f"{stay.property_type} · {stay.city}" if stay.city else stay.property_type
        items.append(
            {
                "kind": "stays",
                "id": stay.pk,
                "title": stay.title,
                "subtitle": subtitle,
                "image": _absolute_url(request, str(stay.cover_image).strip()) if stay.cover_image else None,
                "href": f"/accommodation/{stay.pk}",
                "meta": f"N${stay.price_per_night}/night" if stay.price_per_night is not None else None,
            }
        )

    for venue in FoodVenue.objects.filter(owner=owner, is_active=True).order_by("name"):
        items.append(
            {
                "kind": "food",
                "id": venue.pk,
                "title": venue.name,
                "subtitle": venue.cuisine or "",
                "image": _media_url(request, venue.cover_image),
                "href": f"/food/{venue.pk}",
                "meta": None,
            }
        )

    for product in ShopProduct.objects.filter(owner=owner, is_active=True).order_by("name"):
        price_meta = f"N${product.price}" if product.price is not None else None
        items.append(
            {
                "kind": "shop",
                "id": product.pk,
                "title": product.name,
                "subtitle": product.get_category_display(),
                "image": _media_url(request, product.cover_image),
                "href": f"/shop/{product.pk}",
                "meta": price_meta,
            }
        )

    guide = TourGuideProfile.objects.filter(user=owner, is_active=True).first()
    if guide:
        from guides.provider_serializers import _photo_url

        display = (getattr(owner.profile, "display_name", None) or "").strip() or owner.username
        items.append(
            {
                "kind": "guides",
                "id": guide.pk,
                "title": display,
                "subtitle": guide.headline,
                "image": _photo_url(guide, request),
                "href": f"/guides/{guide.pk}",
                "meta": f"N${guide.hourly_rate}/hr" if guide.hourly_rate is not None else None,
            }
        )

    if "rental" in transport_modes:
        for vehicle in VehicleRentalListing.objects.filter(owner=owner, is_active=True).order_by(
            "-created_at"
        ):
            subtitle = " · ".join(filter(None, [vehicle.city, vehicle.vehicle_type]))
            items.append(
                {
                    "kind": "transport",
                    "transport_mode": "rental",
                    "id": vehicle.pk,
                    "title": vehicle.title,
                    "subtitle": subtitle,
                    "image": _vehicle_image(request, vehicle),
                    "href": f"/transport/vehicle/{vehicle.pk}",
                    "meta": f"N${vehicle.price_per_day}/day"
                    if vehicle.price_per_day is not None
                    else None,
                }
            )

    if "shared" in transport_modes:
        trips = (
            BusTrip.objects.filter(
                route__operator__owner=owner,
                is_active=True,
                departs_at__gte=now,
            )
            .select_related("route", "route__operator")
            .order_by("departs_at")[:50]
        )
        for trip in trips:
            route = trip.route
            operator = route.operator
            items.append(
                {
                    "kind": "transport",
                    "transport_mode": "shared",
                    "id": trip.pk,
                    "title": f"{route.origin} → {route.destination}",
                    "subtitle": f"{operator.name} · {_format_trip_departure(trip.departs_at)}",
                    "image": _bus_route_image(route),
                    "href": f"/transport/bus/{trip.pk}",
                    "meta": f"N${trip.price}/seat" if trip.price is not None else None,
                }
            )

    for event in Event.objects.filter(business=business, is_published=True).order_by("-starts_at"):
        location = ", ".join(filter(None, [event.city, event.region]))
        subtitle = event.venue or location
        price_meta = None
        if event.is_free:
            price_meta = "Free"
        elif event.price:
            price_meta = event.price if str(event.price).startswith("N$") else f"N${event.price}"
        items.append(
            {
                "kind": "events",
                "id": event.pk,
                "title": event.title,
                "subtitle": subtitle,
                "image": _media_url(request, event.cover_image),
                "href": f"/events/{event.pk}",
                "meta": price_meta,
            }
        )

    return items
