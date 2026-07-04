from django.utils.dateparse import parse_datetime
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsPlatformAdmin
from accounts.platform_audit import log_admin_action
from promotions.constants import MAX_HOME_PINS, PLACEMENT_TARGET_TYPES
from promotions.models import HOMEPAGE_PIN_PLACEMENTS, HomePin, PromotionPlacement
from promotions.services import validate_target_listing


def _serialize_pin(pin: HomePin) -> dict:
    return {
        "id": pin.id,
        "placement": pin.placement,
        "placement_label": dict(PromotionPlacement.choices).get(pin.placement, pin.placement),
        "target_type": pin.target_type,
        "target_id": pin.target_id,
        "target_label": pin.target_label,
        "partner_label": pin.partner_label,
        "region": pin.region,
        "sort_order": pin.sort_order,
        "starts_at": pin.starts_at,
        "ends_at": pin.ends_at,
        "is_active": pin.is_active,
        "created_by_username": pin.created_by.username if pin.created_by_id else None,
        "created_at": pin.created_at,
        "updated_at": pin.updated_at,
    }


def _parse_dt(value):
    if value in (None, ""):
        return None
    if hasattr(value, "isoformat"):
        return value
    return parse_datetime(str(value).replace("Z", "+00:00"))


class PlatformHomePinsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        placement = (request.query_params.get("placement") or "").strip()
        qs = HomePin.objects.select_related("created_by").all()
        if placement:
            qs = qs.filter(placement=placement)
        return Response([_serialize_pin(p) for p in qs])

    def post(self, request):
        data = request.data
        placement = (data.get("placement") or "").strip()
        target_type = (data.get("target_type") or "").strip()
        target_id = str(data.get("target_id") or "").strip()
        if placement not in HOMEPAGE_PIN_PLACEMENTS:
            return Response({"detail": "Invalid homepage placement."}, status=400)
        allowed = PLACEMENT_TARGET_TYPES.get(placement, [])
        if target_type not in allowed:
            return Response({"detail": "target_type not allowed for this placement."}, status=400)
        if not target_id:
            return Response({"detail": "target_id is required."}, status=400)

        is_active = bool(data.get("is_active", True))
        if is_active:
            active_count = HomePin.objects.filter(placement=placement, is_active=True).count()
            if active_count >= MAX_HOME_PINS:
                return Response(
                    {"detail": f"At most {MAX_HOME_PINS} active pins per homepage rail."},
                    status=400,
                )

        ok, label, err = validate_target_listing(target_type, target_id)
        if not ok:
            return Response({"detail": err or "Listing not found."}, status=400)

        max_order = (
            HomePin.objects.filter(placement=placement).order_by("-sort_order").values_list("sort_order", flat=True).first()
        )
        sort_order = int(data.get("sort_order") or ((max_order or 0) + 1))

        pin = HomePin.objects.create(
            placement=placement,
            target_type=target_type,
            target_id=target_id,
            target_label=(data.get("target_label") or label or "").strip()[:255],
            partner_label=(data.get("partner_label") or "Featured").strip()[:80] or "Featured",
            region=(data.get("region") or "").strip()[:120],
            sort_order=sort_order,
            starts_at=_parse_dt(data.get("starts_at")),
            ends_at=_parse_dt(data.get("ends_at")),
            is_active=is_active,
            created_by=request.user,
        )
        log_admin_action(
            actor=request.user,
            action="home_pin_create",
            target_type="home_pin",
            target_id=str(pin.id),
            detail=f"{placement} {target_type}:{target_id}",
        )
        return Response(_serialize_pin(pin), status=status.HTTP_201_CREATED)


class PlatformHomePinDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, pk: int):
        pin = HomePin.objects.filter(pk=pk).first()
        if not pin:
            return Response({"detail": "Not found."}, status=404)
        data = request.data
        if "partner_label" in data:
            pin.partner_label = str(data.get("partner_label") or "Featured").strip()[:80] or "Featured"
        if "target_label" in data:
            pin.target_label = str(data.get("target_label") or "").strip()[:255]
        if "region" in data:
            pin.region = str(data.get("region") or "").strip()[:120]
        if "sort_order" in data:
            try:
                pin.sort_order = int(data.get("sort_order"))
            except (TypeError, ValueError):
                pass
        if "is_active" in data:
            becoming_active = bool(data.get("is_active"))
            if becoming_active and not pin.is_active:
                active_count = HomePin.objects.filter(placement=pin.placement, is_active=True).exclude(pk=pin.pk).count()
                if active_count >= MAX_HOME_PINS:
                    return Response(
                        {"detail": f"At most {MAX_HOME_PINS} active pins per homepage rail."},
                        status=400,
                    )
            pin.is_active = becoming_active
        if "starts_at" in data:
            pin.starts_at = _parse_dt(data.get("starts_at"))
        if "ends_at" in data:
            pin.ends_at = _parse_dt(data.get("ends_at"))
        pin.save()
        log_admin_action(
            actor=request.user,
            action="home_pin_update",
            target_type="home_pin",
            target_id=str(pin.id),
            detail=pin.placement,
        )
        return Response(_serialize_pin(pin))

    def delete(self, request, pk: int):
        pin = HomePin.objects.filter(pk=pk).first()
        if not pin:
            return Response({"detail": "Not found."}, status=404)
        placement = pin.placement
        pin_id = pin.id
        pin.delete()
        log_admin_action(
            actor=request.user,
            action="home_pin_delete",
            target_type="home_pin",
            target_id=str(pin_id),
            detail=placement,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlatformHomePinReorderView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def post(self, request):
        placement = (request.data.get("placement") or "").strip()
        ordered_ids = request.data.get("ordered_ids") or []
        if placement not in HOMEPAGE_PIN_PLACEMENTS:
            return Response({"detail": "Invalid homepage placement."}, status=400)
        if not isinstance(ordered_ids, list) or not ordered_ids:
            return Response({"detail": "ordered_ids is required."}, status=400)
        pins = {p.id: p for p in HomePin.objects.filter(placement=placement, id__in=ordered_ids)}
        for index, pin_id in enumerate(ordered_ids):
            try:
                pid = int(pin_id)
            except (TypeError, ValueError):
                continue
            pin = pins.get(pid)
            if not pin:
                continue
            if pin.sort_order != index:
                pin.sort_order = index
                pin.save(update_fields=["sort_order", "updated_at"])
        log_admin_action(
            actor=request.user,
            action="home_pin_reorder",
            target_type="home_pin",
            target_id=placement,
            detail=",".join(str(i) for i in ordered_ids),
        )
        rows = HomePin.objects.filter(placement=placement).order_by("sort_order", "id")
        return Response([_serialize_pin(p) for p in rows])
