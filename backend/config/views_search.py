from django.db.models import Q
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accommodation.models import AccommodationListing
from accommodation.serializers import AccommodationListingSerializer
from accounts.profile_access import can_message
from accounts.models import User
from accounts.profile_access import filter_posts_for_viewer
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
    }
)


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

        buckets = _parse_types(request.query_params.get("types"))
        limit = _limit_for(buckets)
        viewer = request.user if request.user.is_authenticated else None
        ctx = {"request": request}

        users = []
        if _wants(buckets, "users"):
            users = list(
                User.objects.filter(is_active=True, profile__show_in_search=True)
                .select_related("profile")
                .filter(
                    Q(username__icontains=q)
                    | Q(profile__display_name__icontains=q)
                    | Q(profile__bio__icontains=q)
                    | Q(profile__region__icontains=q)
                    | Q(profile__city__icontains=q)
                )
                .order_by("username")[:limit]
            )

        acc = []
        if _wants(buckets, "accommodation"):
            acc = list(
                AccommodationListing.objects.filter(is_active=True)
                .filter(
                    Q(title__icontains=q)
                    | Q(description__icontains=q)
                    | Q(region__icontains=q)
                    | Q(city__icontains=q)
                )[:limit]
            )

        veh = []
        if _wants(buckets, "vehicles"):
            veh = list(
                VehicleRentalListing.objects.filter(is_active=True)
                .filter(
                    Q(title__icontains=q)
                    | Q(make__icontains=q)
                    | Q(model__icontains=q)
                    | Q(region__icontains=q)
                    | Q(city__icontains=q)
                )[:limit]
            )

        trips = []
        if _wants(buckets, "bus_trips"):
            trips = list(
                BusTrip.objects.filter(is_active=True)
                .select_related("route", "route__operator")
                .filter(
                    Q(route__origin__icontains=q)
                    | Q(route__destination__icontains=q)
                    | Q(route__operator__name__icontains=q)
                )[:limit]
            )

        events = []
        if _wants(buckets, "events"):
            events = list(
                Event.objects.filter(is_published=True)
                .filter(
                    Q(title__icontains=q)
                    | Q(venue__icontains=q)
                    | Q(region__icontains=q)
                    | Q(city__icontains=q)
                    | Q(description__icontains=q)
                )[:limit]
            )

        food = []
        if _wants(buckets, "food"):
            food = list(
                FoodVenue.objects.filter(is_active=True)
                .filter(
                    Q(name__icontains=q)
                    | Q(description__icontains=q)
                    | Q(region__icontains=q)
                    | Q(city__icontains=q)
                    | Q(address__icontains=q)
                )[:limit]
            )

        guides = []
        if _wants(buckets, "guides"):
            guides = list(
                TourGuideProfile.objects.filter(is_active=True)
                .select_related("user", "user__profile")
                .filter(
                    Q(headline__icontains=q)
                    | Q(bio__icontains=q)
                    | Q(user__username__icontains=q)
                )[:limit]
            )

        posts = []
        if _wants(buckets, "posts"):
            posts_qs = Post.objects.filter(is_hidden=False).filter(
                Q(body__icontains=q) | Q(region__icontains=q)
            )
            # Scoped Delvers search only returns Delvers posts.
            if buckets is not None and buckets == frozenset({"posts"}):
                posts_qs = posts_qs.filter(is_delvers=True)
            posts = list(filter_posts_for_viewer(posts_qs, viewer)[:limit])

        questions = []
        if _wants(buckets, "questions"):
            questions_qs = Post.objects.filter(
                is_hidden=False, post_kind=PostKind.QUESTION, is_delvers=False
            ).filter(Q(body__icontains=q) | Q(region__icontains=q) | Q(place_label__icontains=q))
            questions = list(filter_posts_for_viewer(questions_qs, viewer)[:limit])

        journeys = []
        if _wants(buckets, "journeys"):
            journeys_qs = (
                Journey.objects.select_related("author", "author__profile")
                .filter(
                    Q(title__icontains=q)
                    | Q(summary__icontains=q)
                    | Q(tags__icontains=q)
                    | Q(stops__place_name__icontains=q)
                    | Q(stops__region__icontains=q)
                )
                .distinct()
            )
            journeys = list(filter_journeys_for_viewer(journeys_qs, viewer)[:limit])

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
                "types": sorted(buckets) if buckets is not None else sorted(_ALL_BUCKETS),
            }
        )
