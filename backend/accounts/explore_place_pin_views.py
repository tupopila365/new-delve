"""Platform admin CRUD for Explore place pins (editorial chip overrides)."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ExplorePlacePin
from accounts.permissions import IsPlatformAdmin
from accounts.platform_audit import log_admin_action
from accounts.popular_places import (
    MAX_EXPLORE_PLACE_PINS,
    MAX_LABEL_LEN,
    TOWN_CENTRES_BY_COUNTRY,
    resolve_preset_coords,
)


def _serialize_admin_pin(pin: ExplorePlacePin) -> dict:
    return {
        "id": pin.id,
        "country_code": pin.country_code,
        "label": pin.label,
        "region": pin.region or "",
        "latitude": float(pin.latitude),
        "longitude": float(pin.longitude),
        "sort_order": pin.sort_order,
        "is_active": pin.is_active,
        "created_by_username": pin.created_by.username if pin.created_by_id else None,
        "created_at": pin.created_at,
        "updated_at": pin.updated_at,
    }


def _preset_payload(country: str) -> list[dict]:
    return [
        {
            "label": row["label"],
            "region": row.get("region") or "",
            "latitude": float(row["latitude"]),
            "longitude": float(row["longitude"]),
        }
        for row in TOWN_CENTRES_BY_COUNTRY.get(country, [])
    ]


def _parse_coord(value, *, field: str) -> Decimal:
    try:
        num = Decimal(str(value).strip())
    except (InvalidOperation, AttributeError, TypeError) as exc:
        raise ValueError(f"{field} must be a number.") from exc
    return num


def _active_count(country: str, *, exclude_pk: int | None = None) -> int:
    qs = ExplorePlacePin.objects.filter(country_code=country, is_active=True)
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    return qs.count()


class PlatformExplorePlacePinsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        country = (request.query_params.get("country") or "").strip().upper()
        if len(country) != 2:
            countries = sorted(
                set(TOWN_CENTRES_BY_COUNTRY.keys())
                | set(ExplorePlacePin.objects.values_list("country_code", flat=True))
            )
            return Response(
                {
                    "max_pins": MAX_EXPLORE_PLACE_PINS,
                    "countries": countries,
                    "pins": [],
                    "presets": [],
                }
            )
        pins = [
            _serialize_admin_pin(p)
            for p in ExplorePlacePin.objects.filter(country_code=country)
            .select_related("created_by")
            .order_by("sort_order", "id")
        ]
        return Response(
            {
                "country": country,
                "max_pins": MAX_EXPLORE_PLACE_PINS,
                "countries": sorted(
                    set(TOWN_CENTRES_BY_COUNTRY.keys())
                    | set(ExplorePlacePin.objects.values_list("country_code", flat=True))
                ),
                "pins": pins,
                "presets": _preset_payload(country),
            }
        )

    def post(self, request):
        country = (request.data.get("country") or "").strip().upper()
        label = (request.data.get("label") or "").strip()[:MAX_LABEL_LEN]
        if len(country) != 2:
            return Response({"detail": "country is required (ISO 2-letter)."}, status=400)
        if not label:
            return Response({"detail": "label is required."}, status=400)

        region = (request.data.get("region") or "").strip()[:120]
        lat_raw = request.data.get("latitude")
        lng_raw = request.data.get("longitude")
        preset = resolve_preset_coords(country, label)
        if lat_raw in (None, "") or lng_raw in (None, ""):
            if not preset:
                return Response(
                    {"detail": "latitude and longitude are required for non-preset places."},
                    status=400,
                )
            lat = Decimal(str(preset["latitude"]))
            lng = Decimal(str(preset["longitude"]))
            if not region:
                region = (preset.get("region") or "").strip()
            label = preset["label"]  # canonical casing
        else:
            try:
                lat = _parse_coord(lat_raw, field="latitude")
                lng = _parse_coord(lng_raw, field="longitude")
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=400)
            if abs(lat) > 90 or abs(lng) > 180:
                return Response({"detail": "Invalid coordinates."}, status=400)
            if preset and not region:
                region = (preset.get("region") or "").strip()

        is_active = request.data.get("is_active")
        if is_active is None:
            is_active = True
        is_active = bool(is_active)
        if is_active and _active_count(country) >= MAX_EXPLORE_PLACE_PINS:
            return Response(
                {"detail": f"At most {MAX_EXPLORE_PLACE_PINS} active Explore pins per country."},
                status=400,
            )

        max_order = (
            ExplorePlacePin.objects.filter(country_code=country)
            .order_by("-sort_order")
            .values_list("sort_order", flat=True)
            .first()
        )
        sort_order = int(max_order) + 1 if max_order is not None else 0

        pin = ExplorePlacePin.objects.create(
            country_code=country,
            label=label,
            region=region,
            latitude=lat,
            longitude=lng,
            sort_order=sort_order,
            is_active=is_active,
            created_by=request.user,
        )
        log_admin_action(
            actor=request.user,
            action="explore_place_pin_create",
            target_type="explore_place_pin",
            target_id=str(pin.pk),
            detail=f"{country}:{label}",
        )
        return Response(_serialize_admin_pin(pin), status=status.HTTP_201_CREATED)


class PlatformExplorePlacePinDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, pk: int):
        pin = ExplorePlacePin.objects.filter(pk=pk).select_related("created_by").first()
        if not pin:
            return Response({"detail": "Not found."}, status=404)

        if "label" in request.data:
            label = (request.data.get("label") or "").strip()[:MAX_LABEL_LEN]
            if not label:
                return Response({"detail": "label cannot be empty."}, status=400)
            pin.label = label
        if "region" in request.data:
            pin.region = (request.data.get("region") or "").strip()[:120]
        if "latitude" in request.data or "longitude" in request.data:
            try:
                lat = _parse_coord(
                    request.data.get("latitude", pin.latitude),
                    field="latitude",
                )
                lng = _parse_coord(
                    request.data.get("longitude", pin.longitude),
                    field="longitude",
                )
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=400)
            if abs(lat) > 90 or abs(lng) > 180:
                return Response({"detail": "Invalid coordinates."}, status=400)
            pin.latitude = lat
            pin.longitude = lng
        if "sort_order" in request.data:
            try:
                pin.sort_order = max(0, int(request.data.get("sort_order")))
            except (TypeError, ValueError):
                return Response({"detail": "sort_order must be an integer."}, status=400)
        if "is_active" in request.data:
            next_active = bool(request.data.get("is_active"))
            if next_active and not pin.is_active:
                if _active_count(pin.country_code, exclude_pk=pin.pk) >= MAX_EXPLORE_PLACE_PINS:
                    return Response(
                        {
                            "detail": f"At most {MAX_EXPLORE_PLACE_PINS} active Explore pins per country."
                        },
                        status=400,
                    )
            pin.is_active = next_active

        pin.save()
        log_admin_action(
            actor=request.user,
            action="explore_place_pin_update",
            target_type="explore_place_pin",
            target_id=str(pin.pk),
            detail=f"{pin.country_code}:{pin.label}",
        )
        return Response(_serialize_admin_pin(pin))

    def delete(self, request, pk: int):
        pin = ExplorePlacePin.objects.filter(pk=pk).first()
        if not pin:
            return Response({"detail": "Not found."}, status=404)
        detail = f"{pin.country_code}:{pin.label}"
        pin.delete()
        log_admin_action(
            actor=request.user,
            action="explore_place_pin_delete",
            target_type="explore_place_pin",
            target_id=str(pk),
            detail=detail,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlatformExplorePlacePinReorderView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def post(self, request):
        country = (request.data.get("country") or "").strip().upper()
        ordered_ids = request.data.get("ordered_ids") or []
        if len(country) != 2:
            return Response({"detail": "country is required (ISO 2-letter)."}, status=400)
        if not isinstance(ordered_ids, list):
            return Response({"detail": "ordered_ids must be a list."}, status=400)

        pins = {
            p.id: p
            for p in ExplorePlacePin.objects.filter(country_code=country, id__in=ordered_ids)
        }
        for index, pk in enumerate(ordered_ids):
            try:
                pin_id = int(pk)
            except (TypeError, ValueError):
                continue
            pin = pins.get(pin_id)
            if pin and pin.sort_order != index:
                pin.sort_order = index
                pin.save(update_fields=["sort_order", "updated_at"])

        log_admin_action(
            actor=request.user,
            action="explore_place_pin_reorder",
            target_type="explore_place_pin",
            target_id=country,
            detail=f"reordered {len(ordered_ids)} pins",
        )
        rows = [
            _serialize_admin_pin(p)
            for p in ExplorePlacePin.objects.filter(country_code=country)
            .select_related("created_by")
            .order_by("sort_order", "id")
        ]
        return Response(rows)
