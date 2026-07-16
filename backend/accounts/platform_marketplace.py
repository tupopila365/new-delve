"""Cross-vertical marketplace data for platform admin."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Q

from accommodation.models import AccommodationBooking, AccommodationListing
from events_app.models import Event, EventBooking
from food.models import FoodReservation, FoodVenue
from guides.models import GuideBooking, TourGuideProfile
from journeys.models import Journey
from social.models import Post, PostKind
from transport.models import BusTrip, SeatReservation, VehicleRentalBooking, VehicleRentalListing

User = get_user_model()

LISTING_TYPES = (
    "accommodation",
    "guide",
    "vehicle",
    "bus_trip",
    "food",
    "shop",
    "event",
    "post",
    "community",
    "journey",
)

BOOKING_TYPES = ("accommodation", "guide", "vehicle", "bus_seat", "event", "food")


def _matches_search(*values: str, query: str) -> bool:
    q = query.lower()
    return any(q in (v or "").lower() for v in values if v)


def _listing_row(
    *,
    listing_type: str,
    listing_id: int,
    title: str,
    owner_username: str,
    region: str = "",
    city: str = "",
    published: bool,
    price_label: str = "",
    category_label: str = "",
    created_at=None,
    is_featured: bool = False,
) -> dict:
    return {
        "id": f"{listing_type}:{listing_id}",
        "listing_type": listing_type,
        "listing_id": listing_id,
        "title": title,
        "owner_username": owner_username,
        "region": region,
        "city": city,
        "status": "published" if published else "unpublished",
        "price_label": price_label,
        "category_label": category_label,
        "created_at": created_at.isoformat() if created_at else "",
        "is_featured": is_featured,
    }


def list_platform_listings(
    *,
    search: str = "",
    listing_type: str = "",
    status: str = "",
    limit: int = 200,
) -> list[dict]:
    rows: list[dict] = []
    q = search.strip().lower()
    type_filter = listing_type.strip().lower()
    status_filter = status.strip().lower()

    def include(row: dict) -> bool:
        if type_filter and row["listing_type"] != type_filter:
            return False
        if status_filter == "published" and row["status"] != "published":
            return False
        if status_filter == "unpublished" and row["status"] != "unpublished":
            return False
        if q and not _matches_search(
            row["title"],
            row["owner_username"],
            row["region"],
            row["city"],
            row["category_label"],
            query=q,
        ):
            return False
        return True

    if not type_filter or type_filter == "accommodation":
        for item in AccommodationListing.objects.select_related("owner").order_by("-created_at")[:120]:
            row = _listing_row(
                listing_type="accommodation",
                listing_id=item.pk,
                title=item.title,
                owner_username=item.owner.username,
                region=item.region,
                city=item.city,
                published=item.is_active,
                price_label=f"N${item.price_per_night}/night",
                category_label="Stay",
                created_at=item.created_at,
            )
            if include(row):
                rows.append(row)

    if not type_filter or type_filter == "guide":
        for item in TourGuideProfile.objects.select_related("user").order_by("-created_at")[:120]:
            row = _listing_row(
                listing_type="guide",
                listing_id=item.pk,
                title=item.headline,
                owner_username=item.user.username,
                region=", ".join(item.regions or [])[:120],
                city="",
                published=item.is_active,
                price_label=f"N${item.hourly_rate}/hr" if item.hourly_rate else "",
                category_label="Guide",
                created_at=item.created_at,
            )
            if include(row):
                rows.append(row)

    if not type_filter or type_filter == "vehicle":
        for item in VehicleRentalListing.objects.select_related("owner").order_by("-created_at")[:120]:
            row = _listing_row(
                listing_type="vehicle",
                listing_id=item.pk,
                title=item.title,
                owner_username=item.owner.username,
                region=item.region,
                city=item.city,
                published=item.is_active,
                price_label=f"N${item.price_per_day}/day",
                category_label="Vehicle rental",
                created_at=item.created_at,
            )
            if include(row):
                rows.append(row)

    if not type_filter or type_filter == "bus_trip":
        for item in BusTrip.objects.select_related("route", "route__operator", "route__operator__owner").order_by(
            "-departs_at"
        )[:120]:
            route = item.route
            row = _listing_row(
                listing_type="bus_trip",
                listing_id=item.pk,
                title=f"{route.origin} → {route.destination}",
                owner_username=route.operator.owner.username,
                region=route.origin,
                city=route.destination,
                published=item.is_active,
                price_label=f"N${item.price}",
                category_label="Bus trip",
                created_at=item.departs_at,
            )
            if include(row):
                rows.append(row)

    if not type_filter or type_filter == "food":
        from food.models import CuisineType

        cuisine_labels = dict(CuisineType.choices)
        for item in FoodVenue.objects.select_related("owner").order_by("-created_at")[:120]:
            cuisine = cuisine_labels.get(item.cuisine, item.cuisine)
            row = _listing_row(
                listing_type="food",
                listing_id=item.pk,
                title=item.name,
                owner_username=item.owner.username,
                region=item.region,
                city=item.city,
                published=item.is_active,
                price_label=f"{'$' * item.price_level}" if item.price_level else "",
                category_label=f"Food · {cuisine}" if cuisine else "Food & drink",
                created_at=item.created_at,
            )
            if include(row):
                rows.append(row)

    if not type_filter or type_filter == "shop":
        from shop.models import ShopCategory, ShopProduct

        category_labels = dict(ShopCategory.choices)
        for item in ShopProduct.objects.select_related("owner").order_by("-created_at")[:120]:
            category = category_labels.get(item.category, item.category)
            row = _listing_row(
                listing_type="shop",
                listing_id=item.pk,
                title=item.name,
                owner_username=item.owner.username,
                region=item.region,
                city=item.city,
                published=item.is_active,
                price_label=f"N${item.price}" if item.price is not None else "",
                category_label=f"Shop · {category}" if category else "Shop",
                created_at=item.created_at,
            )
            if include(row):
                rows.append(row)

    if not type_filter or type_filter == "event":
        for item in Event.objects.select_related("organizer", "organizer__profile").order_by("-created_at")[:120]:
            if item.is_free:
                price_label = "Free"
            elif item.price:
                price_label = f"N${item.price}"
            else:
                price_label = ""
            row = _listing_row(
                listing_type="event",
                listing_id=item.pk,
                title=item.title,
                owner_username=item.organizer.username,
                region=item.region,
                city=item.city,
                published=item.is_published,
                price_label=price_label,
                category_label="Event",
                created_at=item.created_at,
            )
            if include(row):
                rows.append(row)

    post_types = {t for t in ("post", "community") if not type_filter or type_filter == t}
    if post_types:
        for item in Post.objects.select_related("author").order_by("-created_at")[:120]:
            if item.is_accommodation_story:
                continue
            lt = "post" if item.is_delvers else "community"
            if lt not in post_types:
                continue
            if item.post_kind == PostKind.QUESTION:
                label = "Ask locals question"
            elif item.is_delvers:
                label = "Delvers post"
            else:
                label = "Community tip"
            body = (item.body or item.delvers_board or label)[:80]
            row = _listing_row(
                listing_type=lt,
                listing_id=item.pk,
                title=body,
                owner_username=item.author.username,
                region=item.region,
                city="",
                published=not item.is_hidden,
                price_label="",
                category_label=label,
                created_at=item.created_at,
            )
            if include(row):
                rows.append(row)

    if not type_filter or type_filter == "journey":
        for item in Journey.objects.select_related("author", "author__profile").order_by("-created_at")[:120]:
            region = ""
            first_stop = item.stops.order_by("order", "id").first()
            if first_stop:
                region = first_stop.region or ""
            row = _listing_row(
                listing_type="journey",
                listing_id=item.pk,
                title=item.title,
                owner_username=item.author.username,
                region=region,
                city="",
                published=not item.is_hidden and item.visibility == "public",
                price_label=f"N${item.total_cost}" if item.total_cost else "",
                category_label="Journey",
                created_at=item.created_at,
                is_featured=item.is_featured,
            )
            if include(row):
                rows.append(row)

    rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    return rows[:limit]


def set_listing_published(
    listing_type: str,
    listing_id: int,
    *,
    published: bool,
    reason: str = "",
) -> dict:
    lt = listing_type.strip().lower()
    pk = int(listing_id)

    if lt == "accommodation":
        obj = AccommodationListing.objects.filter(pk=pk).first()
        if not obj:
            raise ValueError("Listing not found.")
        obj.is_active = published
        obj.save(update_fields=["is_active"])
        return _listing_row(
            listing_type=lt,
            listing_id=pk,
            title=obj.title,
            owner_username=obj.owner.username,
            region=obj.region,
            city=obj.city,
            published=obj.is_active,
            price_label=f"N${obj.price_per_night}/night",
            category_label="Stay",
            created_at=obj.created_at,
        )

    if lt == "guide":
        obj = TourGuideProfile.objects.select_related("user").filter(pk=pk).first()
        if not obj:
            raise ValueError("Listing not found.")
        obj.is_active = published
        obj.save(update_fields=["is_active"])
        return _listing_row(
            listing_type=lt,
            listing_id=pk,
            title=obj.headline,
            owner_username=obj.user.username,
            region=", ".join(obj.regions or [])[:120],
            published=obj.is_active,
            category_label="Guide",
            created_at=obj.created_at,
        )

    if lt == "vehicle":
        obj = VehicleRentalListing.objects.select_related("owner").filter(pk=pk).first()
        if not obj:
            raise ValueError("Listing not found.")
        obj.is_active = published
        obj.save(update_fields=["is_active"])
        return _listing_row(
            listing_type=lt,
            listing_id=pk,
            title=obj.title,
            owner_username=obj.owner.username,
            region=obj.region,
            city=obj.city,
            published=obj.is_active,
            category_label="Vehicle rental",
            created_at=obj.created_at,
        )

    if lt == "bus_trip":
        obj = BusTrip.objects.select_related("route", "route__operator__owner").filter(pk=pk).first()
        if not obj:
            raise ValueError("Listing not found.")
        obj.is_active = published
        obj.save(update_fields=["is_active"])
        route = obj.route
        return _listing_row(
            listing_type=lt,
            listing_id=pk,
            title=f"{route.origin} → {route.destination}",
            owner_username=route.operator.owner.username,
            published=obj.is_active,
            category_label="Bus trip",
            created_at=obj.departs_at,
        )

    if lt == "food":
        obj = FoodVenue.objects.select_related("owner").filter(pk=pk).first()
        if not obj:
            raise ValueError("Listing not found.")
        obj.is_active = published
        obj.save(update_fields=["is_active"])
        return _listing_row(
            listing_type=lt,
            listing_id=pk,
            title=obj.name,
            owner_username=obj.owner.username,
            region=obj.region,
            city=obj.city,
            published=obj.is_active,
            category_label="Food & drink",
            created_at=obj.created_at,
        )

    if lt == "shop":
        from shop.models import ShopProduct

        obj = ShopProduct.objects.select_related("owner").filter(pk=pk).first()
        if not obj:
            raise ValueError("Listing not found.")
        obj.is_active = published
        obj.save(update_fields=["is_active"])
        return _listing_row(
            listing_type=lt,
            listing_id=pk,
            title=obj.name,
            owner_username=obj.owner.username,
            region=obj.region,
            city=obj.city,
            published=obj.is_active,
            category_label="Shop",
            created_at=obj.created_at,
        )

    if lt == "event":
        obj = Event.objects.select_related("organizer").filter(pk=pk).first()
        if not obj:
            raise ValueError("Listing not found.")
        obj.is_published = published
        obj.save(update_fields=["is_published"])
        return _listing_row(
            listing_type=lt,
            listing_id=pk,
            title=obj.title,
            owner_username=obj.organizer.username,
            region=obj.region,
            city=obj.city,
            published=obj.is_published,
            category_label="Event",
            created_at=obj.created_at,
        )

    if lt in ("post", "community"):
        obj = Post.objects.select_related("author").filter(pk=pk).first()
        if not obj:
            raise ValueError("Listing not found.")
        obj.is_hidden = not published
        if reason:
            obj.moderation_reason = reason if not published else ""
        obj.save(update_fields=["is_hidden", "moderation_reason", "updated_at"])
        label = "Delvers post" if obj.is_delvers else "Community post"
        return _listing_row(
            listing_type=lt,
            listing_id=pk,
            title=(obj.body or label)[:80],
            owner_username=obj.author.username,
            region=obj.region,
            published=not obj.is_hidden,
            category_label=label,
            created_at=obj.created_at,
        )

    if lt == "journey":
        obj = Journey.objects.select_related("author").filter(pk=pk).first()
        if not obj:
            raise ValueError("Listing not found.")
        obj.is_hidden = not published
        if reason:
            obj.moderation_reason = reason if not published else ""
        region = ""
        first_stop = obj.stops.order_by("order", "id").first()
        if first_stop:
            region = first_stop.region or ""
        obj.save(update_fields=["is_hidden", "moderation_reason", "updated_at"])
        return _listing_row(
            listing_type=lt,
            listing_id=pk,
            title=obj.title,
            owner_username=obj.author.username,
            region=region,
            published=not obj.is_hidden and obj.visibility == "public",
            price_label=f"N${obj.total_cost}" if obj.total_cost else "",
            category_label="Journey",
            created_at=obj.created_at,
            is_featured=obj.is_featured,
        )

    raise ValueError(f"Unsupported listing_type: {listing_type}")


def _booking_row(
    *,
    booking_type: str,
    booking_id: int,
    customer_username: str,
    listing_title: str,
    provider_username: str,
    status: str,
    total_price: str = "",
    start_label: str = "",
    end_label: str = "",
    created_at=None,
    has_notes: bool = False,
) -> dict:
    return {
        "id": f"{booking_type}:{booking_id}",
        "booking_type": booking_type,
        "booking_id": booking_id,
        "customer_username": customer_username,
        "listing_title": listing_title,
        "provider_username": provider_username,
        "status": status,
        "total_price": total_price,
        "start_date": start_label,
        "end_date": end_label,
        "created_at": created_at.isoformat() if created_at else "",
        "has_dispute_notes": has_notes,
    }


def _booking_has_notes(booking_type: str, booking_id: int) -> bool:
    from accounts.models import PlatformBookingNote

    return PlatformBookingNote.objects.filter(booking_type=booking_type, booking_id=booking_id).exists()


def list_platform_bookings(
    *,
    search: str = "",
    booking_type: str = "",
    status: str = "",
    limit: int = 200,
) -> list[dict]:
    rows: list[dict] = []
    q = search.strip().lower()
    type_filter = booking_type.strip().lower()
    status_filter = status.strip().lower()

    def include(row: dict) -> bool:
        if type_filter and row["booking_type"] != type_filter:
            return False
        if status_filter and row["status"] != status_filter:
            return False
        if q and not _matches_search(
            row["listing_title"],
            row["customer_username"],
            row["provider_username"],
            row["status"],
            query=q,
        ):
            return False
        return True

    if not type_filter or type_filter == "accommodation":
        for b in AccommodationBooking.objects.select_related("guest", "listing", "listing__owner").order_by(
            "-created_at"
        )[:120]:
            row = _booking_row(
                booking_type="accommodation",
                booking_id=b.pk,
                customer_username=b.guest.username,
                listing_title=b.listing.title,
                provider_username=b.listing.owner.username,
                status=b.status,
                total_price=str(b.total_price),
                start_label=b.check_in.isoformat(),
                end_label=b.check_out.isoformat(),
                created_at=b.created_at,
                has_notes=_booking_has_notes("accommodation", b.pk),
            )
            if include(row):
                rows.append(row)

    if not type_filter or type_filter == "guide":
        from guides.provider_serializers import _package_title

        for b in GuideBooking.objects.select_related("client", "guide", "guide__user").order_by("-created_at")[:120]:
            pkg_title = _package_title(b.guide, b.package_id)
            listing_title = (
                f"{pkg_title} · {b.guide.headline}"
                if (b.package_id or "").strip() and pkg_title != "Custom tour"
                else b.guide.headline
            )
            row = _booking_row(
                booking_type="guide",
                booking_id=b.pk,
                customer_username=b.client.username,
                listing_title=listing_title,
                provider_username=b.guide.user.username,
                status=b.status,
                total_price=str(b.total_price),
                start_label=b.date.isoformat(),
                end_label="",
                created_at=b.created_at,
                has_notes=_booking_has_notes("guide", b.pk),
            )
            if include(row):
                rows.append(row)

    if not type_filter or type_filter == "vehicle":
        for b in VehicleRentalBooking.objects.select_related("renter", "listing", "listing__owner").order_by(
            "-created_at"
        )[:120]:
            row = _booking_row(
                booking_type="vehicle",
                booking_id=b.pk,
                customer_username=b.renter.username,
                listing_title=b.listing.title,
                provider_username=b.listing.owner.username,
                status=b.status,
                total_price=str(b.total_price),
                start_label=b.start_date.isoformat(),
                end_label=b.end_date.isoformat(),
                created_at=b.created_at,
                has_notes=_booking_has_notes("vehicle", b.pk),
            )
            if include(row):
                rows.append(row)

    if not type_filter or type_filter == "bus_seat":
        for b in SeatReservation.objects.select_related(
            "passenger", "trip", "trip__route", "trip__route__operator__owner"
        ).order_by("-created_at")[:120]:
            trip = b.trip
            route = trip.route
            row = _booking_row(
                booking_type="bus_seat",
                booking_id=b.pk,
                customer_username=b.passenger.username,
                listing_title=f"{route.origin} → {route.destination} (seat {b.seat_number})",
                provider_username=route.operator.owner.username,
                status=b.status,
                total_price=str(trip.price),
                start_label=trip.departs_at.isoformat(),
                end_label=trip.arrives_at.isoformat() if trip.arrives_at else "",
                created_at=b.created_at,
                has_notes=_booking_has_notes("bus_seat", b.pk),
            )
            if include(row):
                rows.append(row)

    if not type_filter or type_filter == "event":
        for b in EventBooking.objects.select_related(
            "attendee", "event", "event__organizer"
        ).order_by("-created_at")[:120]:
            row = _booking_row(
                booking_type="event",
                booking_id=b.pk,
                customer_username=b.attendee.username,
                listing_title=b.event.title,
                provider_username=b.event.organizer.username,
                status=b.status,
                total_price=str(b.total_price) if b.total_price is not None else "0",
                start_label=b.event.starts_at.isoformat(),
                end_label=b.event.ends_at.isoformat() if b.event.ends_at else "",
                created_at=b.created_at,
                has_notes=_booking_has_notes("event", b.pk),
            )
            if include(row):
                rows.append(row)

    if not type_filter or type_filter == "food":
        for b in FoodReservation.objects.select_related("guest", "venue", "venue__owner").order_by(
            "-created_at"
        )[:120]:
            row = _booking_row(
                booking_type="food",
                booking_id=b.pk,
                customer_username=b.guest.username,
                listing_title=b.venue.name,
                provider_username=b.venue.owner.username,
                status=b.status,
                total_price="",
                start_label=b.reserved_for.isoformat(),
                end_label="",
                created_at=b.created_at,
                has_notes=_booking_has_notes("food", b.pk),
            )
            if include(row):
                rows.append(row)

    rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    return rows[:limit]


def get_platform_booking_detail(booking_type: str, booking_id: int) -> dict | None:
    from accounts.models import PlatformBookingNote

    bt = booking_type.strip().lower()
    pk = int(booking_id)
    base: dict | None = None

    if bt == "accommodation":
        b = AccommodationBooking.objects.select_related("guest", "listing", "listing__owner").filter(pk=pk).first()
        if b:
            base = {
                **_booking_row(
                    booking_type=bt,
                    booking_id=pk,
                    customer_username=b.guest.username,
                    listing_title=b.listing.title,
                    provider_username=b.listing.owner.username,
                    status=b.status,
                    total_price=str(b.total_price),
                    start_label=b.check_in.isoformat(),
                    end_label=b.check_out.isoformat(),
                    created_at=b.created_at,
                ),
                "guests": b.guests,
                "room_type_name": b.room_type_name,
                "special_requests": b.special_requests,
                "mock_payment_ref": b.mock_payment_ref,
            }

    elif bt == "guide":
        from guides.provider_serializers import _package_title

        b = GuideBooking.objects.select_related("client", "guide", "guide__user").filter(pk=pk).first()
        if b:
            pkg_title = _package_title(b.guide, b.package_id)
            listing_title = (
                f"{pkg_title} · {b.guide.headline}"
                if (b.package_id or "").strip() and pkg_title != "Custom tour"
                else b.guide.headline
            )
            start_time = b.start_time.strftime("%H:%M") if b.start_time else ""
            base = {
                **_booking_row(
                    booking_type=bt,
                    booking_id=pk,
                    customer_username=b.client.username,
                    listing_title=listing_title,
                    provider_username=b.guide.user.username,
                    status=b.status,
                    total_price=str(b.total_price),
                    start_label=b.date.isoformat(),
                    end_label="",
                    created_at=b.created_at,
                ),
                "group_size": b.group_size,
                "duration_hours": b.duration_hours,
                "meeting_point": b.meeting_point,
                "package_id": b.package_id,
                "package_title": pkg_title,
                "start_time": start_time,
                "notes": b.notes,
                "mock_payment_ref": b.mock_payment_ref,
                "guide_id": b.guide_id,
                "guide_headline": b.guide.headline,
            }

    elif bt == "vehicle":
        b = VehicleRentalBooking.objects.select_related("renter", "listing", "listing__owner").filter(pk=pk).first()
        if b:
            base = {
                **_booking_row(
                    booking_type=bt,
                    booking_id=pk,
                    customer_username=b.renter.username,
                    listing_title=b.listing.title,
                    provider_username=b.listing.owner.username,
                    status=b.status,
                    total_price=str(b.total_price),
                    start_label=b.start_date.isoformat(),
                    end_label=b.end_date.isoformat(),
                    created_at=b.created_at,
                ),
                "pickup_area": b.pickup_area,
                "mock_payment_ref": b.mock_payment_ref,
            }

    elif bt == "bus_seat":
        b = SeatReservation.objects.select_related(
            "passenger", "trip", "trip__route", "trip__route__operator__owner"
        ).filter(pk=pk).first()
        if b:
            trip = b.trip
            route = trip.route
            base = {
                **_booking_row(
                    booking_type=bt,
                    booking_id=pk,
                    customer_username=b.passenger.username,
                    listing_title=f"{route.origin} → {route.destination}",
                    provider_username=route.operator.owner.username,
                    status=b.status,
                    total_price=str(trip.price),
                    start_label=trip.departs_at.isoformat(),
                    end_label=trip.arrives_at.isoformat() if trip.arrives_at else "",
                    created_at=b.created_at,
                ),
                "seat_number": b.seat_number,
                "mock_payment_ref": b.mock_payment_ref,
            }

    elif bt == "event":
        b = EventBooking.objects.select_related("attendee", "event", "event__organizer").filter(pk=pk).first()
        if b:
            base = {
                **_booking_row(
                    booking_type=bt,
                    booking_id=pk,
                    customer_username=b.attendee.username,
                    listing_title=b.event.title,
                    provider_username=b.event.organizer.username,
                    status=b.status,
                    total_price=str(b.total_price) if b.total_price is not None else "0",
                    start_label=b.event.starts_at.isoformat(),
                    end_label=b.event.ends_at.isoformat() if b.event.ends_at else "",
                    created_at=b.created_at,
                ),
                "tickets": b.tickets,
                "booking_ref": b.booking_ref,
                "special_requests": b.special_requests,
                "mock_payment_ref": b.mock_payment_ref,
            }

    elif bt == "food":
        b = FoodReservation.objects.select_related("guest", "venue", "venue__owner").filter(pk=pk).first()
        if b:
            base = {
                **_booking_row(
                    booking_type=bt,
                    booking_id=pk,
                    customer_username=b.guest.username,
                    listing_title=b.venue.name,
                    provider_username=b.venue.owner.username,
                    status=b.status,
                    total_price="",
                    start_label=b.reserved_for.isoformat(),
                    end_label="",
                    created_at=b.created_at,
                ),
                "party_size": b.party_size,
                "special_requests": b.special_requests,
            }

    if not base:
        return None

    notes = PlatformBookingNote.objects.filter(booking_type=bt, booking_id=pk).select_related("author")
    base["dispute_notes"] = [
        {
            "id": n.pk,
            "author_username": n.author.username if n.author else "system",
            "body": n.body,
            "created_at": n.created_at.isoformat(),
        }
        for n in notes
    ]
    base["has_dispute_notes"] = bool(base["dispute_notes"])
    return base


def list_unverified_email_users(*, search: str = "", limit: int = 100) -> list[dict]:
    qs = User.objects.select_related("profile").filter(profile__email_verified=False).order_by("-date_joined")
    if search.strip():
        q = search.strip()
        qs = qs.filter(
            Q(username__icontains=q) | Q(email__icontains=q) | Q(profile__display_name__icontains=q)
        )
    return [
        {
            "id": u.pk,
            "username": u.username,
            "email": u.email,
            "display_name": getattr(u.profile, "display_name", ""),
            "date_joined": u.date_joined.isoformat(),
            "user_type": getattr(u.profile, "user_type", "normal"),
        }
        for u in qs[:limit]
    ]
