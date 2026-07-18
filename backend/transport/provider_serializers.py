"""Serializers for provider transport dashboard (/api/transport/provider-*)."""

from __future__ import annotations

from datetime import date

from django.db import transaction
from rest_framework import serializers

from accounts.business_access import resolve_provider_listing_owner, user_can_manage_listing
from common.gallery_media import media_url_kind

from .cover_media import bus_cover_kind, vehicle_cover_kind, vehicle_cover_url
from .models import (
    BusOperator,
    BusRoute,
    BusTrip,
    SeatReservation,
    VehicleRentalBooking,
    VehicleRentalListing,
)
from .serializers import clean_str_list


def _apply_route_cover(route: BusRoute, cover_url: str, *, kind: str | None = None) -> None:
    url = (cover_url or "").strip()
    if not url:
        route.cover_image = ""
        route.cover_kind = "image"
        return
    resolved = kind if kind in ("image", "video") else media_url_kind(url)
    route.cover_image = url
    route.cover_kind = resolved


def _cover_image_url(obj: VehicleRentalListing, request=None) -> str | None:
    return vehicle_cover_url(obj, request)


class ProviderVehicleListingSerializer(serializers.ModelSerializer):
    """Matches frontend ProviderVehicleListing — includes inactive fleet rows."""

    cover_image = serializers.SerializerMethodField()
    cover_kind = serializers.SerializerMethodField()
    cover_image_url = serializers.CharField(write_only=True, required=False, allow_blank=True)
    cover_kind_in = serializers.ChoiceField(
        choices=[("image", "Image"), ("video", "Video")],
        write_only=True,
        required=False,
    )

    class Meta:
        model = VehicleRentalListing
        fields = (
            "id",
            "title",
            "make",
            "model",
            "year",
            "transmission",
            "seats",
            "vehicle_type",
            "price_per_day",
            "region",
            "city",
            "cover_image",
            "cover_kind",
            "cover_image_url",
            "cover_kind_in",
            "description",
            "pickup_location",
            "fuel_type",
            "included_features",
            "highlights",
            "rental_rules",
            "gallery_images",
            "required_renter_documents",
            "is_active",
        )
        read_only_fields = ("id", "cover_kind")

    def validate_highlights(self, value):
        return clean_str_list(value)

    def validate_rental_rules(self, value):
        return clean_str_list(value)

    def get_cover_image(self, obj):
        return _cover_image_url(obj, self.context.get("request"))

    def get_cover_kind(self, obj):
        return vehicle_cover_kind(obj)

    def _apply_cover_url(self, instance, url: str, *, kind: str | None = None):
        url = (url or "").strip()
        if not url:
            return
        resolved_kind = kind if kind in ("image", "video") else media_url_kind(url)
        instance.cover_image = url
        instance.cover_kind = resolved_kind
        gallery = list(instance.gallery_images or [])
        # Keep gallery in sync with cover as first media item.
        cover_entry = url
        if gallery and isinstance(gallery[0], dict):
            gallery = [{"url": url, "kind": resolved_kind}, *[g for g in gallery[1:] if g]]
        elif gallery and gallery[0] == url:
            pass
        elif gallery:
            gallery = [cover_entry, *gallery]
        else:
            gallery = [cover_entry]
        instance.gallery_images = gallery

    def create(self, validated_data):
        cover_url = validated_data.pop("cover_image_url", "")
        cover_kind = validated_data.pop("cover_kind_in", None)
        user = self.context["request"].user
        validated_data["owner"] = user
        # Avoid assigning ImageField-style file into TextField cover_image accidentally.
        validated_data.pop("cover_image", None)
        if not cover_url and "cover_image" in self.initial_data:
            raw = self.initial_data.get("cover_image")
            if isinstance(raw, str):
                cover_url = raw
        if cover_kind is None and "cover_kind" in self.initial_data:
            raw_kind = self.initial_data.get("cover_kind")
            if raw_kind in ("image", "video"):
                cover_kind = raw_kind
        instance = super().create(validated_data)
        if cover_url:
            self._apply_cover_url(instance, cover_url, kind=cover_kind)
            instance.save(update_fields=["cover_image", "cover_kind", "gallery_images"])
        return instance

    def update(self, instance, validated_data):
        cover_url = validated_data.pop("cover_image_url", None)
        cover_kind = validated_data.pop("cover_kind_in", None)
        validated_data.pop("cover_image", None)
        if cover_url is None and "cover_image" in self.initial_data:
            raw = self.initial_data.get("cover_image")
            if isinstance(raw, str):
                cover_url = raw
        if cover_kind is None and "cover_kind" in self.initial_data:
            raw_kind = self.initial_data.get("cover_kind")
            if raw_kind in ("image", "video"):
                cover_kind = raw_kind
        instance = super().update(instance, validated_data)
        if cover_url is not None:
            self._apply_cover_url(instance, cover_url, kind=cover_kind)
            instance.save(update_fields=["cover_image", "cover_kind", "gallery_images"])
        return instance

    def validate(self, attrs):
        request = self.context.get("request")
        if request and self.instance:
            if not user_can_manage_listing(request.user, self.instance.owner_id):
                raise serializers.ValidationError("You cannot edit this listing.")
        return attrs

class ProviderBusTripListingSerializer(serializers.ModelSerializer):
    """Flattened bus trip for provider admin — wraps route + operator."""

    route_detail = serializers.SerializerMethodField()
    available_seats = serializers.SerializerMethodField()
    occupied_seats = serializers.SerializerMethodField()

    class Meta:
        model = BusTrip
        fields = (
            "id",
            "route_detail",
            "departs_at",
            "arrives_at",
            "price",
            "total_seats",
            "available_seats",
            "occupied_seats",
            "amenities",
            "is_active",
        )
        read_only_fields = ("id",)

    def get_route_detail(self, obj: BusTrip) -> dict:
        route = obj.route
        operator = route.operator
        cover = (route.cover_image or "").strip() or None
        return {
            "origin": route.origin,
            "destination": route.destination,
            "operator_name": operator.name,
            "cover_image": cover,
            "cover_kind": bus_cover_kind(route),
            "gallery_images": route.gallery_images or [],
            "stops": route.stops or [],
            "travel_tips": route.travel_tips or [],
            "distance_km": route.distance_km,
            "duration_minutes": route.duration_minutes,
        }

    def get_available_seats(self, obj: BusTrip) -> int:
        from accommodation.models import BookingStatus

        taken = obj.reservations.filter(
            status__in=[BookingStatus.PENDING, BookingStatus.CONFIRMED]
        ).count()
        return max(0, obj.total_seats - taken)

    def get_occupied_seats(self, obj: BusTrip) -> list[int]:
        from accommodation.models import BookingStatus

        return list(
            obj.reservations.filter(
                status__in=[BookingStatus.PENDING, BookingStatus.CONFIRMED]
            )
            .order_by("seat_number")
            .values_list("seat_number", flat=True)
        )


class ProviderBusTripWriteSerializer(serializers.Serializer):
    """Create/update payload from TransportAdmin flattened form."""

    route_detail = serializers.DictField(required=False)
    departs_at = serializers.DateTimeField(required=False)
    arrives_at = serializers.DateTimeField(required=False)
    total_seats = serializers.IntegerField(min_value=1, max_value=200, required=False)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    amenities = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        if self.instance is None:
            missing = [f for f in ("route_detail", "departs_at", "arrives_at", "total_seats", "price") if f not in attrs]
            if missing:
                raise serializers.ValidationError({f: "This field is required." for f in missing})
        route_detail = attrs.get("route_detail")
        if route_detail is not None:
            origin = (route_detail.get("origin") or "").strip()
            destination = (route_detail.get("destination") or "").strip()
            operator_name = (route_detail.get("operator_name") or "").strip()
            if not origin or not destination:
                raise serializers.ValidationError({"route_detail": "Origin and destination are required."})
            if not operator_name:
                raise serializers.ValidationError({"route_detail": "Operator name is required."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        user = request.user
        owner_id = resolve_provider_listing_owner(user)
        route_detail = validated_data["route_detail"]
        operator_name = route_detail["operator_name"].strip()

        operator = BusOperator.objects.filter(owner_id=owner_id, name__iexact=operator_name).first()
        if not operator:
            operator = BusOperator.objects.create(
                owner_id=owner_id,
                name=operator_name,
                region=(route_detail.get("region") or "")[:120],
            )

        origin = route_detail["origin"].strip()
        destination = route_detail["destination"].strip()
        route = BusRoute.objects.filter(
            operator=operator,
            origin__iexact=origin,
            destination__iexact=destination,
        ).first()
        if not route:
            route = BusRoute.objects.create(
                operator=operator,
                origin=origin,
                destination=destination,
                gallery_images=route_detail.get("gallery_images") or [],
                stops=clean_str_list(route_detail.get("stops")),
                travel_tips=clean_str_list(route_detail.get("travel_tips")),
                distance_km=route_detail.get("distance_km"),
                duration_minutes=route_detail.get("duration_minutes"),
            )
            _apply_route_cover(
                route,
                route_detail.get("cover_image") or "",
                kind=route_detail.get("cover_kind"),
            )
            route.save(update_fields=["cover_image", "cover_kind"])
        else:
            if "cover_image" in route_detail or "cover_kind" in route_detail:
                _apply_route_cover(
                    route,
                    route_detail.get("cover_image") if "cover_image" in route_detail else route.cover_image,
                    kind=route_detail.get("cover_kind"),
                )
            if route_detail.get("gallery_images") is not None:
                route.gallery_images = route_detail.get("gallery_images") or []
            if "stops" in route_detail:
                route.stops = clean_str_list(route_detail.get("stops"))
            if "travel_tips" in route_detail:
                route.travel_tips = clean_str_list(route_detail.get("travel_tips"))
            if "distance_km" in route_detail:
                route.distance_km = route_detail.get("distance_km")
            if "duration_minutes" in route_detail:
                route.duration_minutes = route_detail.get("duration_minutes")
            route.save(
                update_fields=[
                    "cover_image",
                    "cover_kind",
                    "gallery_images",
                    "stops",
                    "travel_tips",
                    "distance_km",
                    "duration_minutes",
                ]
            )

        return BusTrip.objects.create(
            route=route,
            departs_at=validated_data["departs_at"],
            arrives_at=validated_data["arrives_at"],
            price=validated_data["price"],
            total_seats=validated_data["total_seats"],
            amenities=validated_data.get("amenities") or [],
            is_active=validated_data.get("is_active", True),
        )

    @transaction.atomic
    def update(self, instance: BusTrip, validated_data):
        request = self.context["request"]
        user = request.user
        if instance.route.operator.owner_id != user.id:
            from accounts.business_access import user_can_manage_listing

            if not user_can_manage_listing(user, instance.route.operator.owner_id):
                raise serializers.ValidationError("You cannot edit this trip.")

        route_detail = validated_data.get("route_detail")
        if route_detail:
            route = instance.route
            if route_detail.get("origin"):
                route.origin = route_detail["origin"].strip()
            if route_detail.get("destination"):
                route.destination = route_detail["destination"].strip()
            if route_detail.get("operator_name"):
                route.operator.name = route_detail["operator_name"].strip()
                route.operator.save(update_fields=["name"])
            if "cover_image" in route_detail or "cover_kind" in route_detail:
                _apply_route_cover(
                    route,
                    route_detail.get("cover_image") if "cover_image" in route_detail else route.cover_image,
                    kind=route_detail.get("cover_kind"),
                )
            if route_detail.get("gallery_images") is not None:
                route.gallery_images = route_detail.get("gallery_images") or []
            if "stops" in route_detail:
                route.stops = clean_str_list(route_detail.get("stops"))
            if "travel_tips" in route_detail:
                route.travel_tips = clean_str_list(route_detail.get("travel_tips"))
            if "distance_km" in route_detail:
                route.distance_km = route_detail.get("distance_km")
            if "duration_minutes" in route_detail:
                route.duration_minutes = route_detail.get("duration_minutes")
            route.save(
                update_fields=[
                    "origin",
                    "destination",
                    "cover_image",
                    "cover_kind",
                    "gallery_images",
                    "stops",
                    "travel_tips",
                    "distance_km",
                    "duration_minutes",
                ]
            )

        for field in ("departs_at", "arrives_at", "price", "total_seats", "amenities", "is_active"):
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()
        return instance


class ProviderRentalBookingSerializer(serializers.ModelSerializer):
    vehicle_title = serializers.CharField(source="listing.title", read_only=True)
    guest_username = serializers.CharField(source="renter.username", read_only=True)
    guest_display_name = serializers.SerializerMethodField()
    check_in = serializers.DateField(source="start_date")
    check_out = serializers.DateField(source="end_date")
    days = serializers.SerializerMethodField()
    renter_document_count = serializers.SerializerMethodField()

    class Meta:
        model = VehicleRentalBooking
        fields = (
            "id",
            "vehicle_title",
            "guest_display_name",
            "guest_username",
            "check_in",
            "check_out",
            "days",
            "total_price",
            "status",
            "renter_document_count",
            "created_at",
        )

    def get_guest_display_name(self, obj):
        profile = getattr(obj.renter, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return obj.renter.username

    def get_days(self, obj) -> int:
        start: date = obj.start_date
        end: date = obj.end_date
        return max(1, (end - start).days + 1)

    def get_renter_document_count(self, obj):
        docs = obj.renter_documents or []
        return len(docs) if isinstance(docs, list) else 0


class ProviderSeatBookingSerializer(serializers.ModelSerializer):
    route_label = serializers.SerializerMethodField()
    passenger_display_name = serializers.SerializerMethodField()
    passenger_username = serializers.CharField(source="passenger.username", read_only=True)
    seat = serializers.IntegerField(source="seat_number")
    date = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = SeatReservation
        fields = (
            "id",
            "route_label",
            "passenger_display_name",
            "passenger_username",
            "seat",
            "date",
            "total_price",
            "status",
            "created_at",
        )

    def get_route_label(self, obj):
        route = obj.trip.route
        return f"{route.origin} → {route.destination}"

    def get_passenger_display_name(self, obj):
        profile = getattr(obj.passenger, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return obj.passenger.username

    def get_date(self, obj):
        return obj.trip.departs_at.date().isoformat()

    def get_total_price(self, obj):
        return str(obj.trip.price)
