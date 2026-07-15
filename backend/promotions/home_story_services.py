"""Resolve admin-curated home story slides for the public highlights API."""

from __future__ import annotations

from django.utils import timezone

from promotions.constants import MAX_HOME_STORY_SLIDES
from promotions.models import HOME_STORY_CHANNEL_IDS, HomeStoryChannelConfig, HomeStorySlide, HomeStorySourceType


def ensure_channel_configs() -> list[HomeStoryChannelConfig]:
    rows: list[HomeStoryChannelConfig] = []
    for channel_id in HOME_STORY_CHANNEL_IDS:
        obj, _ = HomeStoryChannelConfig.objects.get_or_create(channel_id=channel_id)
        rows.append(obj)
    return rows


def channel_auto_fill_map() -> dict[str, bool]:
    configs = {c.channel_id: c.auto_fill for c in HomeStoryChannelConfig.objects.all()}
    return {cid: configs.get(cid, True) for cid in HOME_STORY_CHANNEL_IDS}


def active_editorial_slides(channel_id: str) -> list[HomeStorySlide]:
    if channel_id not in HOME_STORY_CHANNEL_IDS:
        return []
    now = timezone.now()
    qs = HomeStorySlide.objects.filter(channel_id=channel_id, is_active=True).order_by("sort_order", "id")
    qs = qs.filter(models_q_starts_ends(now))
    return list(qs[:MAX_HOME_STORY_SLIDES])


def models_q_starts_ends(now):
    from django.db.models import Q

    return (Q(starts_at__isnull=True) | Q(starts_at__lte=now)) & (Q(ends_at__isnull=True) | Q(ends_at__gte=now))


def _media_url(file_field, request=None) -> str | None:
    """Resolve ImageField/.url or plain TextField / absolute URL strings."""
    if not file_field:
        return None
    if isinstance(file_field, str):
        url = file_field.strip()
        if not url:
            return None
        if url.startswith(("http://", "https://", "data:", "blob:")):
            return url
        if request is not None and url.startswith("/"):
            return request.build_absolute_uri(url)
        if request is not None and not url.startswith("/"):
            return request.build_absolute_uri(f"/media/{url.lstrip('/')}")
        return url if url.startswith("/") else f"/media/{url.lstrip('/')}"
    try:
        url = file_field.url
    except (ValueError, AttributeError):
        return None
    if not url:
        return None
    if request is not None and url.startswith("/"):
        return request.build_absolute_uri(url)
    return url


def _clip(text: str, limit: int = 100) -> str:
    text = (text or "").strip()
    if len(text) <= limit:
        return text
    return f"{text[: limit - 3]}…"


def resolve_editorial_slide(slide: HomeStorySlide, request=None) -> dict | None:
    """Turn a HomeStorySlide row into a public slide dict, or None if unresolvable."""
    from config.home_stories import IMG_MS, VIDEO_MS, _slide

    override_headline = (slide.headline or "").strip()
    override_sub = (slide.sub or "").strip()
    override_cta_path = (slide.cta_path or "").strip()
    override_cta_label = (slide.cta_label or "").strip()
    override_media = (slide.media_url or "").strip()
    kind = slide.media_kind if slide.media_kind in ("image", "video") else "image"

    if slide.source_type == HomeStorySourceType.CUSTOM:
        if not override_media:
            return None
        return _slide(
            sid=f"editorial-{slide.pk}",
            kind=kind,
            src=override_media,
            headline=override_headline or "Featured",
            sub=override_sub or None,
            duration_ms=VIDEO_MS if kind == "video" else IMG_MS,
            cta_path=override_cta_path or "/",
            cta_label=override_cta_label or "Explore",
            source="editorial",
        )

    if slide.source_type == HomeStorySourceType.POST:
        from social.models import Post

        try:
            pid = int(slide.target_id)
        except (TypeError, ValueError):
            return None
        post = (
            Post.objects.filter(pk=pid, is_hidden=False)
            .select_related("author", "listing", "event", "food_venue", "vehicle_listing", "bus_trip")
            .first()
        )
        if not post:
            return None
        is_video = bool(post.video)
        src = override_media or _media_url(post.video if is_video else post.image, request)
        if not src:
            return None
        cta_path, cta_label = _post_cta(post)
        return _slide(
            sid=f"editorial-{slide.pk}",
            kind="video" if is_video and not override_media else kind if override_media else ("video" if is_video else "image"),
            src=src,
            headline=override_headline or _clip(post.body) or "Story",
            sub=override_sub or post.region or None,
            duration_ms=VIDEO_MS if (is_video and not override_media) or kind == "video" else IMG_MS,
            cta_path=override_cta_path or cta_path,
            cta_label=override_cta_label or cta_label,
            source="editorial",
        )

    listing = _load_listing(slide.source_type, slide.target_id, request)
    if not listing:
        return None
    src = override_media or listing["src"]
    if not src:
        return None
    return _slide(
        sid=f"editorial-{slide.pk}",
        kind=kind if override_media else "image",
        src=src,
        headline=override_headline or listing["headline"],
        sub=override_sub or listing.get("sub"),
        duration_ms=VIDEO_MS if kind == "video" and override_media else IMG_MS,
        cta_path=override_cta_path or listing["cta_path"],
        cta_label=override_cta_label or listing["cta_label"],
        source="editorial",
    )


def _post_cta(post) -> tuple[str, str]:
    if post.listing_id:
        return f"/accommodation/{post.listing_id}", "View stay"
    if post.event_id:
        return f"/events/{post.event_id}", "View event"
    if post.food_venue_id:
        return f"/food/{post.food_venue_id}", "View venue"
    if post.vehicle_listing_id:
        return f"/transport/vehicle/{post.vehicle_listing_id}", "View vehicle"
    if post.bus_trip_id:
        return f"/transport/bus/{post.bus_trip_id}", "View trip"
    if post.is_accommodation_story:
        return f"/u/{post.author.username}", "View host"
    return f"/delvers/posts/{post.pk}", "View pin"


def _load_listing(source_type: str, target_id: str, request=None) -> dict | None:
    try:
        lid = int(target_id)
    except (TypeError, ValueError):
        return None

    if source_type == HomeStorySourceType.ACCOMMODATION:
        from accommodation.models import AccommodationListing

        row = AccommodationListing.objects.filter(pk=lid, is_active=True).first()
        if not row:
            return None
        return {
            "src": _media_url(row.cover_image, request),
            "headline": row.title,
            "sub": " · ".join(b for b in (row.city, row.region) if b) or None,
            "cta_path": f"/accommodation/{row.pk}",
            "cta_label": "View stay",
            "label": row.title,
        }

    if source_type == HomeStorySourceType.FOOD:
        from food.models import FoodVenue

        row = FoodVenue.objects.filter(pk=lid, is_active=True).first()
        if not row:
            return None
        return {
            "src": _media_url(row.cover_image, request),
            "headline": row.name,
            "sub": " · ".join(b for b in (row.city, row.region) if b) or None,
            "cta_path": f"/food/{row.pk}",
            "cta_label": "View venue",
            "label": row.name,
        }

    if source_type == HomeStorySourceType.GUIDE:
        from guides.models import TourGuideProfile

        row = TourGuideProfile.objects.filter(pk=lid, is_active=True).select_related("user", "user__profile").first()
        if not row:
            return None
        profile = getattr(row.user, "profile", None)
        name = (getattr(profile, "display_name", None) or "").strip() or row.user.username
        regions = row.regions or []
        return {
            "src": _media_url(row.photo, request),
            "headline": name,
            "sub": str(regions[0]) if regions else None,
            "cta_path": f"/guides/{row.pk}",
            "cta_label": "View guide",
            "label": name,
        }

    if source_type == HomeStorySourceType.EVENT:
        from events_app.models import Event

        row = Event.objects.filter(pk=lid, is_published=True).first()
        if not row:
            return None
        return {
            "src": _media_url(row.cover_image, request),
            "headline": row.title,
            "sub": " · ".join(b for b in (row.city, row.region) if b) or None,
            "cta_path": f"/events/{row.pk}",
            "cta_label": "View event",
            "label": row.title,
        }

    if source_type == HomeStorySourceType.VEHICLE:
        from transport.models import VehicleRentalListing

        row = VehicleRentalListing.objects.filter(pk=lid, is_active=True).first()
        if not row:
            return None
        return {
            "src": _media_url(row.cover_image, request),
            "headline": row.title,
            "sub": " · ".join(b for b in (row.city, row.region) if b) or None,
            "cta_path": f"/transport/vehicle/{row.pk}",
            "cta_label": "View vehicle",
            "label": row.title,
        }

    if source_type == HomeStorySourceType.BUS_TRIP:
        from transport.models import BusTrip

        row = BusTrip.objects.filter(pk=lid, is_active=True).select_related("route", "route__operator").first()
        if not row:
            return None
        route = row.route
        headline = f"{route.origin} → {route.destination}" if route else f"Trip #{row.pk}"
        return {
            "src": _media_url(route.cover_image, request) if route else None,
            "headline": headline,
            "sub": getattr(route, "operator", None) and route.operator.name or None,
            "cta_path": f"/transport/bus/{row.pk}",
            "cta_label": "View trip",
            "label": headline,
        }

    return None


def resolve_editorial_rows(channel_id: str, request=None) -> list[dict]:
    rows: list[dict] = []
    for slide in active_editorial_slides(channel_id):
        resolved = resolve_editorial_slide(slide, request=request)
        if resolved:
            rows.append(resolved)
    return rows


def validate_story_target(source_type: str, target_id: str, media_url: str = "") -> tuple[bool, str, str]:
    """Return (ok, label, error)."""
    if source_type == HomeStorySourceType.CUSTOM:
        if not (media_url or "").strip():
            return False, "", "media_url is required for custom slides."
        return True, "Custom slide", ""

    if source_type == HomeStorySourceType.POST:
        from social.models import Post

        try:
            pid = int(target_id)
        except (TypeError, ValueError):
            return False, "", "Invalid post id."
        post = Post.objects.filter(pk=pid, is_hidden=False).first()
        if not post:
            return False, "", "Post not found."
        if not post.image and not post.video:
            return False, "", "Post has no media."
        label = (post.body or f"Post #{pid}")[:80]
        return True, label, ""

    listing = _load_listing(source_type, target_id)
    if not listing:
        return False, "", "Listing not found or inactive."
    if not listing.get("src") and source_type != HomeStorySourceType.CUSTOM:
        # Allow pin without cover — admin can set media_url override
        pass
    return True, listing["label"], ""
