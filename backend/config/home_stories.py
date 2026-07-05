"""Build live home highlight channels for GET /api/home/stories/."""

from __future__ import annotations

from django.db.models import Q
from django.utils import timezone

from promotions.models import PromotionPlacement
from promotions.services import featured_for_placement

IMG_MS = 5200
VIDEO_MS = 15000
MAX_SLIDES = 6

CHANNEL_META = (
    {"id": "stays", "label": "Stays", "explore_path": "/accommodation", "ring_initial": "S"},
    {"id": "go", "label": "Transport", "explore_path": "/transport", "ring_initial": "T"},
    {"id": "live", "label": "Events", "explore_path": "/events", "ring_initial": "E"},
    {"id": "eat", "label": "Food", "explore_path": "/food", "ring_initial": "F"},
    {"id": "tours", "label": "Guides", "explore_path": "/guides", "ring_initial": "G"},
    {"id": "pins", "label": "Delvers", "explore_path": "/delvers", "ring_initial": "D"},
)

_FALLBACK_SRC = {
    "stay1": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1080&q=80",
    "stay2": "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1080&q=80",
    "road": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8804?auto=format&fit=crop&w=1080&q=80",
    "bus": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1080&q=80",
    "event": "https://images.unsplash.com/photo-1429963354434-733ffa638db7?auto=format&fit=crop&w=1080&q=80",
    "night": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1080&q=80",
    "food": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1080&q=80",
    "cafe": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1080&q=80",
    "tour": "https://images.unsplash.com/photo-1543248939-ff40856f65d2?auto=format&fit=crop&w=1080&q=80",
    "guide": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1080&q=80",
    "pin1": "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1080&q=80",
    "pin2": "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1080&q=80",
}


def _fallback(sid: str, src: str, headline: str, sub: str, cta_path: str) -> dict:
    return {
        "id": f"fallback-{sid}",
        "kind": "image",
        "src": src,
        "headline": headline,
        "sub": sub,
        "duration_ms": IMG_MS,
        "cta_path": cta_path,
        "cta_label": "Explore",
        "source": "fallback",
    }


FALLBACK_SLIDES: dict[str, list[dict]] = {
    "stays": [
        _fallback("s1", _FALLBACK_SRC["stay1"], "Find your stay", "Boutique rooms and desert lodges across Namibia", "/accommodation"),
        _fallback("s2", _FALLBACK_SRC["stay2"], "Request with confidence", "Real listings from local hosts", "/accommodation"),
        _fallback("s3", _FALLBACK_SRC["stay1"], "Filter what matters", "Guests, price, and region in seconds", "/accommodation"),
    ],
    "go": [
        _fallback("g1", _FALLBACK_SRC["road"], "Hit the road", "Vehicle rentals and transfers for flexible travel", "/transport"),
        _fallback("g2", _FALLBACK_SRC["bus"], "Plan the route", "Compare bus trips, operators, and departure times", "/transport"),
        _fallback("g3", _FALLBACK_SRC["road"], "Confirm the details", "Request transport and finalize arrangements with providers", "/transport"),
    ],
    "live": [
        _fallback("l1", _FALLBACK_SRC["event"], "What's on near you", "Markets, music, and community events", "/events"),
        _fallback("l2", _FALLBACK_SRC["night"], "Tonight and this week", "Save the events worth showing up for", "/events"),
        _fallback("l3", _FALLBACK_SRC["event"], "Create your own", "Post events for travellers and locals", "/events"),
    ],
    "eat": [
        _fallback("e1", _FALLBACK_SRC["food"], "Taste the place", "Grills, cafes, and local flavours", "/food"),
        _fallback("e2", _FALLBACK_SRC["cafe"], "Read the room", "Cuisine, region, and price at a glance", "/food"),
    ],
    "tours": [
        _fallback("t1", _FALLBACK_SRC["tour"], "Walk with a local", "Guides who know every dune and story", "/guides"),
        _fallback("t2", _FALLBACK_SRC["guide"], "Request an experience", "Languages and regions on every profile", "/guides"),
    ],
    "pins": [
        _fallback("p1", _FALLBACK_SRC["pin1"], "Delvers pins", "Save travel ideas and local tips", "/delvers"),
        _fallback("p2", _FALLBACK_SRC["pin2"], "Photo and video", "Short clips and stills in one grid", "/delvers"),
        _fallback("p3", _FALLBACK_SRC["pin2"], "Your boards", "Collect places to go later", "/delvers"),
    ],
}


def _media_url(file_field, request=None) -> str | None:
    if not file_field:
        return None
    try:
        url = file_field.url
    except ValueError:
        return None
    if not url:
        return None
    if request is not None:
        return request.build_absolute_uri(url)
    return url


def _clip(text: str, limit: int = 100) -> str:
    text = (text or "").strip()
    if len(text) <= limit:
        return text
    return f"{text[: limit - 3]}…"


def _slide(
    *,
    sid: str,
    kind: str,
    src: str,
    headline: str,
    sub: str | None = None,
    duration_ms: int = IMG_MS,
    cta_path: str = "",
    cta_label: str = "Explore",
    source: str = "listing",
) -> dict:
    return {
        "id": sid,
        "kind": kind,
        "src": src,
        "headline": headline,
        "sub": sub or "",
        "duration_ms": duration_ms,
        "cta_path": cta_path,
        "cta_label": cta_label,
        "source": source,
    }


def _listing_cover(row: dict) -> str | None:
    for key in ("cover_image", "photo", "image"):
        val = row.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    route = row.get("route_detail")
    if isinstance(route, dict):
        cover = route.get("cover_image")
        if isinstance(cover, str) and cover.strip():
            return cover.strip()
    return None


def _slides_from_featured(
    placement: str,
    *,
    region: str,
    user,
    id_prefix: str,
    headline_keys: tuple[str, ...],
    cta_path_fn,
    cta_label: str,
    sub_keys: tuple[str, ...] = ("city", "region"),
) -> list[dict]:
    rows = featured_for_placement(placement, region=region, user=user, limit=MAX_SLIDES)
    slides: list[dict] = []
    for row in rows:
        src = _listing_cover(row)
        if not src:
            continue
        headline = ""
        for key in headline_keys:
            val = row.get(key)
            if isinstance(val, str) and val.strip():
                headline = val.strip()
                break
        if not headline:
            headline = f"{id_prefix.title()} #{row.get('id')}"
        bits = []
        for key in sub_keys:
            val = row.get(key)
            if isinstance(val, str) and val.strip():
                bits.append(val.strip())
            elif isinstance(val, list) and val:
                bits.append(str(val[0]))
        row_id = row.get("id")
        slides.append(
            _slide(
                sid=f"{id_prefix}-{row_id}",
                kind="image",
                src=src,
                headline=headline,
                sub=" · ".join(bits) if bits else None,
                cta_path=cta_path_fn(row),
                cta_label=cta_label,
                source="listing",
            )
        )
        if len(slides) >= MAX_SLIDES:
            break
    return slides


def _stays_slides(*, region: str, user, request) -> list[dict]:
    from accounts.profile_access import filter_posts_for_viewer
    from social.models import Post

    qs = (
        Post.objects.filter(is_hidden=False, is_accommodation_story=True)
        .filter(Q(image__isnull=False) | Q(video__isnull=False))
        .select_related("author", "author__profile", "listing")
        .order_by("-created_at")
    )
    qs = filter_posts_for_viewer(qs, user if getattr(user, "is_authenticated", False) else None)
    if region:
        qs = qs.filter(
            Q(region__icontains=region)
            | Q(listing__region__icontains=region)
            | Q(listing__city__icontains=region)
        )

    slides: list[dict] = []
    for post in qs[:MAX_SLIDES]:
        is_video = bool(post.video)
        src = _media_url(post.video if is_video else post.image, request)
        if not src:
            continue
        body = _clip(post.body) or "Host story"
        listing = post.listing
        bits = []
        if listing and listing.title:
            bits.append(listing.title)
        if post.region:
            bits.append(post.region)
        has_listing = listing is not None and listing.pk is not None
        cta_path = f"/accommodation/{listing.pk}" if has_listing else f"/u/{post.author.username}"
        cta_label = "View stay" if has_listing else "View host"
        slides.append(
            _slide(
                sid=f"host-story-{post.pk}",
                kind="video" if is_video else "image",
                src=src,
                headline=body,
                sub=" · ".join(bits) if bits else "Host update",
                duration_ms=VIDEO_MS if is_video else IMG_MS,
                cta_path=cta_path,
                cta_label=cta_label,
                source="host_story",
            )
        )

    if slides:
        return slides

    return _slides_from_featured(
        PromotionPlacement.HOMEPAGE_STAYS,
        region=region,
        user=user,
        id_prefix="stay",
        headline_keys=("title",),
        cta_path_fn=lambda row: f"/accommodation/{row.get('id')}",
        cta_label="View stay",
    )


def _pins_slides(*, region: str, user, request) -> list[dict]:
    from accounts.profile_access import filter_posts_for_viewer
    from social.models import Post, PostKind

    qs = (
        Post.objects.filter(is_hidden=False, is_delvers=True)
        .exclude(is_accommodation_story=True)
        .exclude(is_delvers_highlight=True)
        .exclude(post_kind=PostKind.QUESTION)
        .filter(Q(image__isnull=False) | Q(video__isnull=False))
        .select_related(
            "author",
            "author__profile",
            "listing",
            "event",
            "food_venue",
            "vehicle_listing",
            "bus_trip",
        )
        .order_by("-created_at")
    )
    qs = filter_posts_for_viewer(qs, user if getattr(user, "is_authenticated", False) else None)
    if region:
        qs = qs.filter(Q(region__icontains=region) | Q(place_label__icontains=region))

    slides: list[dict] = []
    for post in qs[:MAX_SLIDES]:
        is_video = bool(post.video)
        src = _media_url(post.video if is_video else post.image, request)
        if not src:
            continue
        body = _clip(post.body) or (post.delvers_board or "Delvers pin")
        bits = [b for b in (post.place_label, post.region, post.delvers_board) if b]
        cta_path, cta_label = _post_cta(post)
        slides.append(
            _slide(
                sid=f"post-{post.pk}",
                kind="video" if is_video else "image",
                src=src,
                headline=body,
                sub=" · ".join(bits) if bits else None,
                duration_ms=VIDEO_MS if is_video else IMG_MS,
                cta_path=cta_path,
                cta_label=cta_label,
                source="post",
            )
        )
    return slides


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
    return f"/delvers/posts/{post.pk}", "View pin"


def _events_slides(*, region: str, user) -> list[dict]:
    from events_app.models import Event

    now = timezone.now()
    qs = Event.objects.filter(is_published=True, starts_at__gte=now).select_related("organizer")
    if region:
        qs = qs.filter(Q(region__icontains=region) | Q(city__icontains=region) | Q(venue__icontains=region))
    qs = qs.order_by("starts_at")[: MAX_SLIDES * 2]

    slides: list[dict] = []
    for event in qs:
        src = _media_url(event.cover_image)
        if not src:
            continue
        bits = [b for b in (event.city, event.region) if b]
        slides.append(
            _slide(
                sid=f"event-{event.pk}",
                kind="image",
                src=src,
                headline=event.title,
                sub=" · ".join(bits) if bits else None,
                cta_path=f"/events/{event.pk}",
                cta_label="View event",
                source="listing",
            )
        )
        if len(slides) >= MAX_SLIDES:
            break
    if slides:
        return slides
    return _slides_from_featured(
        PromotionPlacement.HOMEPAGE_EVENTS,
        region=region,
        user=user,
        id_prefix="event",
        headline_keys=("title",),
        cta_path_fn=lambda row: f"/events/{row.get('id')}",
        cta_label="View event",
    )


def _transport_slides(*, region: str, user) -> list[dict]:
    rows = featured_for_placement(
        PromotionPlacement.HOMEPAGE_TRANSPORT,
        region=region,
        user=user,
        limit=MAX_SLIDES,
    )
    slides: list[dict] = []
    for row in rows:
        src = _listing_cover(row)
        if not src:
            continue
        row_id = row.get("id")
        is_bus = "route" in row or "route_detail" in row or "departs_at" in row
        if row.get("vehicle_type") is not None or row.get("price_per_day") is not None:
            is_bus = False
        if row.get("_pin_target_type") == "bus_trip":
            is_bus = True
        elif row.get("_pin_target_type") == "vehicle":
            is_bus = False

        route = row.get("route_detail") if isinstance(row.get("route_detail"), dict) else {}
        headline = row.get("title") or ""
        if is_bus and route:
            origin = route.get("origin") or ""
            destination = route.get("destination") or ""
            if origin and destination:
                headline = f"{origin} → {destination}"
            elif route.get("operator_name"):
                headline = str(route["operator_name"])
        if not headline:
            headline = f"Transport #{row_id}"

        bits = []
        if is_bus and route:
            bits.extend(b for b in (route.get("origin"), route.get("destination")) if b)
        else:
            bits.extend(b for b in (row.get("city"), row.get("region")) if b)

        slides.append(
            _slide(
                sid=f"{'trip' if is_bus else 'vehicle'}-{row_id}",
                kind="image",
                src=src,
                headline=str(headline),
                sub=" · ".join(str(b) for b in bits) if bits else None,
                cta_path=f"/transport/bus/{row_id}" if is_bus else f"/transport/vehicle/{row_id}",
                cta_label="View trip" if is_bus else "View vehicle",
                source="listing",
            )
        )
        if len(slides) >= MAX_SLIDES:
            break
    return slides


def _live_slides(channel_id: str, *, region: str, user, request) -> list[dict]:
    if channel_id == "stays":
        return _stays_slides(region=region, user=user, request=request)
    if channel_id == "go":
        return _transport_slides(region=region, user=user)
    if channel_id == "live":
        return _events_slides(region=region, user=user)
    if channel_id == "eat":
        return _slides_from_featured(
            PromotionPlacement.HOMEPAGE_FOOD,
            region=region,
            user=user,
            id_prefix="food",
            headline_keys=("name", "title"),
            cta_path_fn=lambda row: f"/food/{row.get('id')}",
            cta_label="View venue",
        )
    if channel_id == "tours":
        return _slides_from_featured(
            PromotionPlacement.HOMEPAGE_GUIDES,
            region=region,
            user=user,
            id_prefix="guide",
            headline_keys=("display_name", "title", "name"),
            cta_path_fn=lambda row: f"/guides/{row.get('id')}",
            cta_label="View guide",
            sub_keys=("regions", "region", "city"),
        )
    if channel_id == "pins":
        return _pins_slides(region=region, user=user, request=request)
    return []


def build_home_stories(*, region: str = "", user=None, request=None) -> dict:
    """Return { channels: [...] } for the traveller home highlights row.

    Priority per channel: editorial slides → live auto-fill (if enabled) → stock fallback.
    """
    from promotions.home_story_services import channel_auto_fill_map, resolve_editorial_rows

    region = (region or "").strip()
    auto_fill_map = channel_auto_fill_map()
    channels: list[dict] = []
    for meta in CHANNEL_META:
        channel_id = meta["id"]
        auto_fill = auto_fill_map.get(channel_id, True)
        slides: list[dict] = list(resolve_editorial_rows(channel_id, request=request))
        seen = {s["id"] for s in slides}

        if auto_fill and len(slides) < MAX_SLIDES:
            for live in _live_slides(channel_id, region=region, user=user, request=request):
                if live["id"] in seen:
                    continue
                slides.append(live)
                seen.add(live["id"])
                if len(slides) >= MAX_SLIDES:
                    break

        if not slides:
            slides = [dict(s) for s in FALLBACK_SLIDES.get(channel_id, [])]

        ring_image = slides[0]["src"] if slides else None
        channels.append(
            {
                "id": channel_id,
                "label": meta["label"],
                "explore_path": meta["explore_path"],
                "ring_initial": meta["ring_initial"],
                "ring_image": ring_image,
                "auto_fill": auto_fill,
                "slides": slides,
            }
        )
    return {"channels": channels}
