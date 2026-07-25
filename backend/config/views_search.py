from django.db.models import Q
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accommodation.models import AccommodationListing
from accommodation.serializers import AccommodationListingSerializer
from accounts.models import User
from accounts.profile_access import can_message, filter_posts_for_viewer
from events_app.models import Event
from events_app.serializers import EventSerializer
from food.models import FoodVenue
from food.serializers import FoodVenueSerializer
from guides.models import TourGuideProfile
from guides.serializers import TourGuideProfileSerializer
from journeys.models import Journey
from journeys.serializers import JourneySearchSerializer, filter_journeys_for_viewer
from social.models import Post, PostKind
from social.serializers import PostSerializer
from transport.models import BusTrip, VehicleRentalListing
from transport.serializers import BusTripSerializer, VehicleRentalListingSerializer

_EMPTY = {
    "users": [],
    "accommodation": [],
    "vehicles": [],
    "bus_trips": [],
    "events": [],
    "food": [],
    "guides": [],
    "posts": [],
    "questions": [],
    "journeys": [],
    "deals": [],
}

# Public type tokens → response bucket keys.
_TYPE_TO_BUCKETS = {
    "profile": frozenset({"users"}),
    "stay": frozenset({"accommodation"}),
    "food": frozenset({"food"}),
    "events": frozenset({"events"}),
    "guides": frozenset({"guides"}),
    "transport": frozenset({"vehicles", "bus_trips"}),
    "delvers": frozenset({"posts"}),
    "ask_locals": frozenset({"questions"}),
    "journeys": frozenset({"journeys"}),
    "deals": frozenset({"deals"}),
}

_ALL_BUCKETS = frozenset(
    {
        "users",
        "accommodation",
        "vehicles",
        "bus_trips",
        "events",
        "food",
        "guides",
        "posts",
        "questions",
        "journeys",
        "deals",
    }
)

# Synonyms so obscure long-tail queries still hit inventory.
_SEARCH_SYNONYMS: dict[str, tuple[str, ...]] = {
    "brunch": ("breakfast", "cafe", "morning"),
    "mechanic": ("garage", "tyre", "tire", "repair", "workshop"),
    "hidden brunch": ("hidden", "brunch", "locals only", "local favourite"),
    "tiny house": ("tiny", "cabin", "compact", "micro"),
    "off-grid": ("solar", "remote", "bush", "unplugged"),
    "street food": ("kapana", "market", "stall", "takeaway"),
    "niche tour": ("specialist", "bespoke", "private", "hidden"),
}


def _parse_types(raw: str | None) -> frozenset[str] | None:
    """Return bucket keys to include, or None when all types are requested."""
    if not raw or not str(raw).strip():
        return None
    buckets: set[str] = set()
    for part in str(raw).split(","):
        token = part.strip().lower()
        mapped = _TYPE_TO_BUCKETS.get(token)
        if mapped:
            buckets |= mapped
    return frozenset(buckets) if buckets else None


def _wants(buckets: frozenset[str] | None, name: str) -> bool:
    return buckets is None or name in buckets


def _limit_for(buckets: frozenset[str] | None) -> int:
    # Scoped search can return more hits; all-types stays compact.
    if buckets is not None and len(buckets) <= 2:
        return 20
    return 8


def _search_needles(q: str) -> list[str]:
    raw = (q or "").strip().lower()
    if not raw:
        return []
    needles = {raw, *(_SEARCH_SYNONYMS.get(raw) or ())}
    for token in raw.split():
        if len(token) < 2:
            continue
        needles.add(token)
        needles.update(_SEARCH_SYNONYMS.get(token) or ())
    return [n for n in needles if len(n) >= 2]


def _icontains_any(fields: list[str], needles: list[str]) -> Q:
    clause = Q()
    for field in fields:
        for needle in needles:
            clause |= Q(**{f"{field}__icontains": needle})
    return clause


def _country_clause(country: str, *, region_field: str = "region") -> Q:
    """Match Explore country via country_code, or legacy rows with empty code."""
    cc = (country or "").strip().upper()
    if not cc:
        return Q()
    return Q(**{"country_code__iexact": cc}) | Q(**{"country_code": ""})


def _serialize_search_user(user, request) -> dict:
    profile = user.profile
    avatar = None
    if profile.avatar:
        avatar = request.build_absolute_uri(profile.avatar.url)
    payload = {
        "id": user.id,
        "username": user.username,
        "display_name": profile.display_name,
        "avatar": avatar,
        "user_type": profile.user_type,
        "city": profile.city,
        "region": profile.region,
        "bio": (profile.bio or "")[:160],
    }
    viewer = request.user if request.user.is_authenticated else None
    if viewer:
        payload["can_message"] = can_message(viewer, user)
    return payload


class UnifiedSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response(_EMPTY)

        needles = _search_needles(q)
        country = (request.query_params.get("country_code") or "").strip().upper()[:2]
        buckets = _parse_types(request.query_params.get("types"))
        limit = _limit_for(buckets)
        viewer = request.user if request.user.is_authenticated else None
        ctx = {"request": request}
        country_q = _country_clause(country)

        users = []
        if _wants(buckets, "users"):
            users = list(
                User.objects.filter(is_active=True, profile__show_in_search=True)
                .select_related("profile")
                .filter(
                    _icontains_any(
                        [
                            "username",
                            "profile__display_name",
                            "profile__bio",
                            "profile__region",
                            "profile__city",
                        ],
                        needles,
                    )
                )
                .order_by("username")[:limit]
            )

        acc = []
        if _wants(buckets, "accommodation"):
            qs = AccommodationListing.objects.filter(is_active=True).filter(
                _icontains_any(
                    [
                        "title",
                        "description",
                        "region",
                        "city",
                        "address",
                        "formatted_address",
                        "amenities",
                        "niche_tags",
                        "property_type",
                    ],
                    needles,
                )
            )
            if country_q:
                qs = qs.filter(country_q)
            acc = list(qs[:limit])

        veh = []
        if _wants(buckets, "vehicles"):
            qs = VehicleRentalListing.objects.filter(is_active=True).filter(
                _icontains_any(
                    ["title", "make", "model", "region", "city", "description"],
                    needles,
                )
            )
            if country_q:
                qs = qs.filter(country_q)
            veh = list(qs[:limit])

        trips = []
        if _wants(buckets, "bus_trips"):
            trips = list(
                BusTrip.objects.filter(is_active=True)
                .select_related("route", "route__operator")
                .filter(
                    _icontains_any(
                        [
                            "route__origin",
                            "route__destination",
                            "route__operator__name",
                        ],
                        needles,
                    )
                )[:limit]
            )

        events = []
        if _wants(buckets, "events"):
            qs = Event.objects.filter(is_published=True).filter(
                _icontains_any(
                    ["title", "venue", "region", "city", "description"],
                    needles,
                )
            )
            if country_q:
                qs = qs.filter(country_q)
            events = list(qs[:limit])

        food = []
        if _wants(buckets, "food"):
            qs = FoodVenue.objects.filter(is_active=True).filter(
                _icontains_any(
                    [
                        "name",
                        "description",
                        "tagline",
                        "popular_dish",
                        "cuisine",
                        "region",
                        "city",
                        "address",
                        "formatted_address",
                        "amenities",
                        "niche_tags",
                    ],
                    needles,
                )
            )
            if country_q:
                qs = qs.filter(country_q)
            food = list(qs[:limit])

        guides = []
        if _wants(buckets, "guides"):
            guides = list(
                TourGuideProfile.objects.filter(is_active=True)
                .select_related("user", "user__profile")
                .filter(
                    _icontains_any(
                        [
                            "headline",
                            "bio",
                            "user__username",
                            "specialities",
                            "languages",
                            "regions",
                        ],
                        needles,
                    )
                )[:limit]
            )

        posts = []
        if _wants(buckets, "posts"):
            posts_qs = Post.objects.filter(is_hidden=False).filter(
                _icontains_any(["body", "region", "place_label"], needles)
            )
            # Scoped Delvers search only returns Delvers posts.
            if buckets is not None and buckets == frozenset({"posts"}):
                posts_qs = posts_qs.filter(is_delvers=True)
            posts = list(filter_posts_for_viewer(posts_qs, viewer)[:limit])

        questions = []
        if _wants(buckets, "questions"):
            questions_qs = Post.objects.filter(
                is_hidden=False, post_kind=PostKind.QUESTION, is_delvers=False
            ).filter(_icontains_any(["body", "region", "place_label"], needles))
            questions = list(filter_posts_for_viewer(questions_qs, viewer)[:limit])

        journeys = []
        if _wants(buckets, "journeys"):
            journeys_qs = (
                Journey.objects.select_related("author", "author__profile")
                .filter(
                    _icontains_any(
                        [
                            "title",
                            "summary",
                            "tags",
                            "stops__place_name",
                            "stops__region",
                        ],
                        needles,
                    )
                )
                .distinct()
            )
            journeys = list(filter_journeys_for_viewer(journeys_qs, viewer)[:limit])

        deals = []
        if _wants(buckets, "deals"):
            from accounts.deals_discovery import discover_deals

            profile = getattr(viewer, "profile", None) if viewer else None
            deals = discover_deals(
                q=q,
                region=country,  # soft: Explore country code not always region name
                limit=limit,
                viewer_profile=profile,
            )

        return Response(
            {
                "users": [_serialize_search_user(u, request) for u in users],
                "accommodation": AccommodationListingSerializer(acc, many=True, context=ctx).data,
                "vehicles": VehicleRentalListingSerializer(veh, many=True, context=ctx).data,
                "bus_trips": BusTripSerializer(trips, many=True, context=ctx).data,
                "events": EventSerializer(events, many=True, context=ctx).data,
                "food": FoodVenueSerializer(food, many=True, context=ctx).data,
                "guides": TourGuideProfileSerializer(guides, many=True, context=ctx).data,
                "posts": PostSerializer(posts, many=True, context=ctx).data,
                "questions": PostSerializer(questions, many=True, context=ctx).data,
                "journeys": JourneySearchSerializer(journeys, many=True, context=ctx).data,
                "deals": deals,
                "types": sorted(buckets) if buckets is not None else sorted(_ALL_BUCKETS),
            }
        )
