from django.utils.dateparse import parse_datetime
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsPlatformAdmin
from accounts.platform_audit import log_admin_action
from config.home_stories import CHANNEL_META
from promotions.constants import MAX_HOME_STORY_SLIDES
from promotions.home_story_services import ensure_channel_configs, validate_story_target
from promotions.models import HOME_STORY_CHANNEL_IDS, HomeStoryChannelConfig, HomeStorySlide, HomeStorySourceType

CHANNEL_LABELS = {m["id"]: m["label"] for m in CHANNEL_META}
SOURCE_LABELS = dict(HomeStorySourceType.choices)


def _parse_dt(value):
    if value in (None, ""):
        return None
    if hasattr(value, "isoformat"):
        return value
    return parse_datetime(str(value).replace("Z", "+00:00"))


def _serialize_channel(config: HomeStoryChannelConfig) -> dict:
    active_count = HomeStorySlide.objects.filter(channel_id=config.channel_id, is_active=True).count()
    return {
        "channel_id": config.channel_id,
        "label": CHANNEL_LABELS.get(config.channel_id, config.channel_id),
        "auto_fill": config.auto_fill,
        "active_slides": active_count,
        "max_slides": MAX_HOME_STORY_SLIDES,
        "updated_by_username": config.updated_by.username if config.updated_by_id else None,
        "updated_at": config.updated_at,
    }


def _serialize_slide(slide: HomeStorySlide) -> dict:
    return {
        "id": slide.id,
        "channel_id": slide.channel_id,
        "channel_label": CHANNEL_LABELS.get(slide.channel_id, slide.channel_id),
        "source_type": slide.source_type,
        "source_type_label": SOURCE_LABELS.get(slide.source_type, slide.source_type),
        "target_id": slide.target_id,
        "target_label": slide.target_label,
        "headline": slide.headline,
        "sub": slide.sub,
        "cta_path": slide.cta_path,
        "cta_label": slide.cta_label,
        "media_url": slide.media_url,
        "media_kind": slide.media_kind,
        "sort_order": slide.sort_order,
        "starts_at": slide.starts_at,
        "ends_at": slide.ends_at,
        "is_active": slide.is_active,
        "created_by_username": slide.created_by.username if slide.created_by_id else None,
        "created_at": slide.created_at,
        "updated_at": slide.updated_at,
    }


class PlatformHomeStoryChannelsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        configs = ensure_channel_configs()
        return Response([_serialize_channel(c) for c in configs])


class PlatformHomeStoryChannelDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, channel_id: str):
        channel_id = (channel_id or "").strip()
        if channel_id not in HOME_STORY_CHANNEL_IDS:
            return Response({"detail": "Invalid channel."}, status=400)
        config, _ = HomeStoryChannelConfig.objects.get_or_create(channel_id=channel_id)
        if "auto_fill" in request.data:
            config.auto_fill = bool(request.data.get("auto_fill"))
        config.updated_by = request.user
        config.save()
        log_admin_action(
            actor=request.user,
            action="home_story_channel_update",
            target_type="home_story_channel",
            target_id=channel_id,
            detail=f"auto_fill={config.auto_fill}",
        )
        return Response(_serialize_channel(config))


class PlatformHomeStorySlidesView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        channel_id = (request.query_params.get("channel") or "").strip()
        qs = HomeStorySlide.objects.select_related("created_by").all()
        if channel_id:
            qs = qs.filter(channel_id=channel_id)
        return Response([_serialize_slide(s) for s in qs])

    def post(self, request):
        data = request.data
        channel_id = (data.get("channel_id") or "").strip()
        source_type = (data.get("source_type") or "").strip()
        target_id = str(data.get("target_id") or "").strip()
        media_url = str(data.get("media_url") or "").strip()

        if channel_id not in HOME_STORY_CHANNEL_IDS:
            return Response({"detail": "Invalid channel."}, status=400)
        if source_type not in {c.value for c in HomeStorySourceType}:
            return Response({"detail": "Invalid source_type."}, status=400)

        is_active = bool(data.get("is_active", True))
        if is_active:
            active_count = HomeStorySlide.objects.filter(channel_id=channel_id, is_active=True).count()
            if active_count >= MAX_HOME_STORY_SLIDES:
                return Response(
                    {"detail": f"At most {MAX_HOME_STORY_SLIDES} active slides per channel."},
                    status=400,
                )

        ok, label, err = validate_story_target(source_type, target_id, media_url)
        if not ok:
            return Response({"detail": err or "Invalid target."}, status=400)

        max_order = (
            HomeStorySlide.objects.filter(channel_id=channel_id)
            .order_by("-sort_order")
            .values_list("sort_order", flat=True)
            .first()
        )
        sort_order = int(data.get("sort_order") or ((max_order or 0) + 1))
        media_kind = (data.get("media_kind") or "image").strip()
        if media_kind not in ("image", "video"):
            media_kind = "image"

        slide = HomeStorySlide.objects.create(
            channel_id=channel_id,
            source_type=source_type,
            target_id=target_id if source_type != HomeStorySourceType.CUSTOM else "",
            target_label=(data.get("target_label") or label or "").strip()[:255],
            headline=(data.get("headline") or "").strip()[:200],
            sub=(data.get("sub") or "").strip()[:255],
            cta_path=(data.get("cta_path") or "").strip()[:255],
            cta_label=(data.get("cta_label") or "").strip()[:80],
            media_url=media_url[:500],
            media_kind=media_kind,
            sort_order=sort_order,
            starts_at=_parse_dt(data.get("starts_at")),
            ends_at=_parse_dt(data.get("ends_at")),
            is_active=is_active,
            created_by=request.user,
        )
        log_admin_action(
            actor=request.user,
            action="home_story_slide_create",
            target_type="home_story_slide",
            target_id=str(slide.id),
            detail=f"{channel_id} {source_type}:{target_id or 'custom'}",
        )
        return Response(_serialize_slide(slide), status=status.HTTP_201_CREATED)


class PlatformHomeStorySlideDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, pk: int):
        slide = HomeStorySlide.objects.filter(pk=pk).first()
        if not slide:
            return Response({"detail": "Not found."}, status=404)
        data = request.data
        field_limits = {
            "headline": 200,
            "sub": 255,
            "cta_path": 255,
            "cta_label": 80,
            "target_label": 255,
            "media_url": 500,
        }
        for field, limit in field_limits.items():
            if field in data:
                setattr(slide, field, str(data.get(field) or "").strip()[:limit])
        if "media_kind" in data:
            kind = str(data.get("media_kind") or "image").strip()
            if kind in ("image", "video"):
                slide.media_kind = kind
        if "sort_order" in data:
            try:
                slide.sort_order = int(data.get("sort_order"))
            except (TypeError, ValueError):
                pass
        if "is_active" in data:
            becoming_active = bool(data.get("is_active"))
            if becoming_active and not slide.is_active:
                active_count = (
                    HomeStorySlide.objects.filter(channel_id=slide.channel_id, is_active=True)
                    .exclude(pk=slide.pk)
                    .count()
                )
                if active_count >= MAX_HOME_STORY_SLIDES:
                    return Response(
                        {"detail": f"At most {MAX_HOME_STORY_SLIDES} active slides per channel."},
                        status=400,
                    )
            slide.is_active = becoming_active
        if "starts_at" in data:
            slide.starts_at = _parse_dt(data.get("starts_at"))
        if "ends_at" in data:
            slide.ends_at = _parse_dt(data.get("ends_at"))
        slide.save()
        log_admin_action(
            actor=request.user,
            action="home_story_slide_update",
            target_type="home_story_slide",
            target_id=str(slide.id),
            detail=slide.channel_id,
        )
        return Response(_serialize_slide(slide))

    def delete(self, request, pk: int):
        slide = HomeStorySlide.objects.filter(pk=pk).first()
        if not slide:
            return Response({"detail": "Not found."}, status=404)
        channel_id = slide.channel_id
        slide_id = slide.id
        slide.delete()
        log_admin_action(
            actor=request.user,
            action="home_story_slide_delete",
            target_type="home_story_slide",
            target_id=str(slide_id),
            detail=channel_id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlatformHomeStorySlideReorderView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def post(self, request):
        channel_id = (request.data.get("channel_id") or "").strip()
        ordered_ids = request.data.get("ordered_ids") or []
        if channel_id not in HOME_STORY_CHANNEL_IDS:
            return Response({"detail": "Invalid channel."}, status=400)
        if not isinstance(ordered_ids, list) or not ordered_ids:
            return Response({"detail": "ordered_ids is required."}, status=400)
        slides = {s.id: s for s in HomeStorySlide.objects.filter(channel_id=channel_id, id__in=ordered_ids)}
        for index, slide_id in enumerate(ordered_ids):
            try:
                sid = int(slide_id)
            except (TypeError, ValueError):
                continue
            slide = slides.get(sid)
            if not slide:
                continue
            if slide.sort_order != index:
                slide.sort_order = index
                slide.save(update_fields=["sort_order", "updated_at"])
        log_admin_action(
            actor=request.user,
            action="home_story_slide_reorder",
            target_type="home_story_channel",
            target_id=channel_id,
            detail=",".join(str(i) for i in ordered_ids),
        )
        rows = HomeStorySlide.objects.filter(channel_id=channel_id).order_by("sort_order", "id")
        return Response([_serialize_slide(s) for s in rows])
