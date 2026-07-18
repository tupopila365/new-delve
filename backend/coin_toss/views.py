import secrets

from django.db.models import Count, Exists, OuterRef
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .geo import VOTE_PROXIMITY_MILES, bounding_box, haversine_miles, to_float, within_miles
from .models import AntiCommercialFlag, CommunityVote, TossLocation, TossLocationSave
from .serializers import (
    AddLocationSerializer,
    FlagRequestSerializer,
    TossLocationSerializer,
    TossRequestSerializer,
    VoteRequestSerializer,
    normalize_toss_media,
)

# Reject "add a gem" when the GPS fix is too weak to trust physical presence.
ADD_ACCURACY_MAX_M = 150.0
# Two adds within ~50 m are treated as the same spot (merge → upvote instead).
DUPLICATE_MERGE_MILES = 0.031
# Same name within ~0.5 mi also merges — catches nearby duplicates by title.
NAME_MERGE_MILES = 0.5


def _find_nearby_duplicate(lat: float, lon: float, *, name: str | None = None) -> TossLocation | None:
    """Prefer exact proximity match; else same name within NAME_MERGE_MILES."""
    min_lat, max_lat, min_lon, max_lon = bounding_box(lat, lon, max(DUPLICATE_MERGE_MILES, NAME_MERGE_MILES))
    existing = TossLocation.objects.filter(
        is_excluded=False,
        latitude__gte=min_lat,
        latitude__lte=max_lat,
        longitude__gte=min_lon,
        longitude__lte=max_lon,
    )
    proximity_match = None
    name_match = None
    needle = (name or "").strip().casefold()
    for loc in existing:
        loc_lat = to_float(loc.latitude)
        loc_lon = to_float(loc.longitude)
        if loc_lat is None or loc_lon is None:
            continue
        if within_miles(lat, lon, loc_lat, loc_lon, DUPLICATE_MERGE_MILES):
            proximity_match = loc
            break
        if (
            needle
            and name_match is None
            and loc.name.strip().casefold() == needle
            and within_miles(lat, lon, loc_lat, loc_lon, NAME_MERGE_MILES)
        ):
            name_match = loc
    return proximity_match or name_match


def _location_with_counts(location_id: int, user=None) -> TossLocation:
    qs = (
        TossLocation.objects.annotate(upvote_count=Count("votes", distinct=True))
        .annotate(commercial_flag_count=Count("commercial_flags", distinct=True))
    )
    if user is not None and getattr(user, "is_authenticated", False):
        qs = qs.annotate(
            saved_by_me=Exists(
                TossLocationSave.objects.filter(location_id=OuterRef("pk"), user_id=user.id)
            )
        )
    return qs.get(pk=location_id)


def _eligible_queryset(*, min_upvotes: int):
    """
    Eligible pool: not kill-switched, meets community upvote threshold.
    No premium / sponsored / commercial weights — ever.
    """
    return (
        TossLocation.objects.filter(is_excluded=False)
        .annotate(upvote_count=Count("votes", distinct=True))
        .annotate(commercial_flag_count=Count("commercial_flags", distinct=True))
        .filter(upvote_count__gte=min_upvotes)
    )


def _nearby_locations(
    *,
    lat: float,
    lon: float,
    radius_miles: float,
    min_upvotes: int,
    categories: list[str] | None = None,
):
    min_lat, max_lat, min_lon, max_lon = bounding_box(lat, lon, radius_miles)
    qs = _eligible_queryset(min_upvotes=min_upvotes).filter(
        latitude__gte=min_lat,
        latitude__lte=max_lat,
        longitude__gte=min_lon,
        longitude__lte=max_lon,
    )
    if categories:
        qs = qs.filter(category__in=categories)
    candidates = list(qs)
    nearby = []
    for loc in candidates:
        loc_lat = to_float(loc.latitude)
        loc_lon = to_float(loc.longitude)
        if loc_lat is None or loc_lon is None:
            continue
        if within_miles(lat, lon, loc_lat, loc_lon, radius_miles):
            nearby.append(loc)
    return nearby


class CoinTossView(APIView):
    """
    Unbiased randomizer: pick one eligible nearby location with a cryptographic draw.
    Uses secrets.choice (not weighted ads / premium boosts).
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = TossRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        lat = data["latitude"]
        lon = data["longitude"]
        radius = data["radius_miles"]
        min_upvotes = data["min_upvotes"]

        nearby = _nearby_locations(
            lat=lat,
            lon=lon,
            radius_miles=radius,
            min_upvotes=min_upvotes,
            categories=data.get("categories") or None,
        )
        if not nearby:
            return Response(
                {
                    "detail": "Nothing matched near you. Try a wider distance or loosen the filters.",
                    "candidate_count": 0,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Pure random draw — no commercial weighting
        winner = secrets.choice(nearby)
        winner = _location_with_counts(winner.pk, request.user)
        payload = TossLocationSerializer(winner, context={"request": request}).data
        payload["candidate_count"] = len(nearby)
        return Response(payload)


class TossLocationListView(APIView):
    """
    GET: public list of non-excluded locations (discovery).
    POST: add a favourite gem to the Quintos from the user's live location.
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        qs = (
            TossLocation.objects.filter(is_excluded=False)
            .annotate(upvote_count=Count("votes", distinct=True))
            .annotate(commercial_flag_count=Count("commercial_flags", distinct=True))
        )

        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(name__icontains=q)

        lat = to_float(request.query_params.get("latitude"))
        lon = to_float(request.query_params.get("longitude"))

        # Cap search results; full list without q stays available for discovery.
        if q:
            locations = list(qs.order_by("name")[:40])
            if lat is not None and lon is not None:
                def distance_key(loc: TossLocation) -> float:
                    loc_lat = to_float(loc.latitude)
                    loc_lon = to_float(loc.longitude)
                    if loc_lat is None or loc_lon is None:
                        return 1e9
                    return haversine_miles(lat, lon, loc_lat, loc_lon)

                locations.sort(key=distance_key)
                locations = locations[:10]
            else:
                locations = locations[:10]
            return Response(
                TossLocationSerializer(locations, many=True, context={"request": request}).data
            )

        return Response(
            TossLocationSerializer(qs.order_by("name"), many=True, context={"request": request}).data
        )

    def post(self, request):
        ser = AddLocationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        lat = data["latitude"]
        lon = data["longitude"]
        accuracy = data.get("accuracy_m")

        # Physical presence: the gem is stamped with the user's live coordinates.
        # A weak GPS fix means we can't confirm they're actually standing there.
        if accuracy is not None and accuracy > ADD_ACCURACY_MAX_M:
            return Response(
                {
                    "detail": (
                        "We couldn't confirm you're at the spot — your GPS signal is weak "
                        f"(±{int(accuracy)} m). Walk up to the place and try again."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Merge near-duplicates: same place within ~50 m, or same name nearby.
        match = _find_nearby_duplicate(lat, lon, name=data.get("name"))

        if match is not None:
            CommunityVote.objects.get_or_create(
                user=request.user,
                location=match,
                defaults={"voter_latitude": lat, "voter_longitude": lon},
            )
            incoming = normalize_toss_media(data.get("media") or [])
            if incoming:
                merged_media = normalize_toss_media([*(match.media or []), *incoming])
                if merged_media != (match.media or []):
                    match.media = merged_media
                    match.save(update_fields=["media", "updated_at"])
            payload = TossLocationSerializer(
                _location_with_counts(match.pk, request.user),
                context={"request": request},
            ).data
            payload["merged"] = True
            payload["detail"] = "That gem is already on the map — we added your upvote instead."
            return Response(payload, status=status.HTTP_200_OK)

        location = TossLocation.objects.create(
            name=data["name"],
            category=data["category"],
            description=data.get("description", ""),
            latitude=lat,
            longitude=lon,
            region=data.get("region", ""),
            city=data.get("city", ""),
            media=normalize_toss_media(data.get("media") or []),
        )
        # Adding = the first verified on-site upvote (they're physically there).
        CommunityVote.objects.create(
            user=request.user,
            location=location,
            voter_latitude=lat,
            voter_longitude=lon,
        )
        payload = TossLocationSerializer(
            _location_with_counts(location.pk, request.user),
            context={"request": request},
        ).data
        payload["merged"] = False
        payload["detail"] = (
            "Thanks! Your gem is on the map. It joins the toss once it reaches "
            "3 on-site upvotes."
        )
        return Response(payload, status=status.HTTP_201_CREATED)


class VoteLocationView(APIView):
    """Upvote only when the voter's coords match the spot (physical presence)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, location_id: int):
        ser = VoteRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        voter_lat = ser.validated_data["latitude"]
        voter_lon = ser.validated_data["longitude"]

        try:
            location = TossLocation.objects.get(pk=location_id)
        except TossLocation.DoesNotExist:
            return Response({"detail": "Location not found."}, status=status.HTTP_404_NOT_FOUND)

        if location.is_excluded:
            return Response(
                {"detail": "This location is excluded from the randomizer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        loc_lat = to_float(location.latitude)
        loc_lon = to_float(location.longitude)
        if loc_lat is None or loc_lon is None:
            return Response(
                {"detail": "Location has invalid coordinates."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not within_miles(voter_lat, voter_lon, loc_lat, loc_lon, VOTE_PROXIMITY_MILES):
            return Response(
                {
                    "detail": (
                        "You must be at this spot to upvote. "
                        f"Move within ~{int(VOTE_PROXIMITY_MILES * 1609)} meters and try again."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        vote, created = CommunityVote.objects.get_or_create(
            user=request.user,
            location=location,
            defaults={
                "voter_latitude": voter_lat,
                "voter_longitude": voter_lon,
            },
        )
        if not created:
            return Response(
                {"detail": "You already upvoted this spot.", "upvote_count": location.votes.count()},
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "detail": "Upvote recorded.",
                "id": vote.id,
                "upvote_count": location.votes.count(),
            },
            status=status.HTTP_201_CREATED,
        )


class FlagLocationView(APIView):
    """Flag commercial gaming. Auto kill-switch at threshold flags."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, location_id: int):
        ser = FlagRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            location = TossLocation.objects.get(pk=location_id)
        except TossLocation.DoesNotExist:
            return Response({"detail": "Location not found."}, status=status.HTTP_404_NOT_FOUND)

        flag, created = AntiCommercialFlag.objects.get_or_create(
            user=request.user,
            location=location,
            defaults={"reason": ser.validated_data.get("reason", "")},
        )
        flag_count = location.commercial_flags.count()
        excluded = False
        if flag_count >= AntiCommercialFlag.COMMERCIAL_FLAG_KILL_THRESHOLD:
            if not location.is_excluded:
                location.is_excluded = True
                location.save(update_fields=["is_excluded", "updated_at"])
            excluded = True

        return Response(
            {
                "detail": "Flag recorded." if created else "You already flagged this spot.",
                "id": flag.id,
                "commercial_flag_count": flag_count,
                "is_excluded": excluded or location.is_excluded,
                "created": created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class SaveLocationView(APIView):
    """Toggle saving a tossed spot for later (revisit / upvote when you get there)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, location_id: int):
        try:
            location = TossLocation.objects.get(pk=location_id, is_excluded=False)
        except TossLocation.DoesNotExist:
            return Response({"detail": "Location not found."}, status=status.HTTP_404_NOT_FOUND)

        save_obj, created = TossLocationSave.objects.get_or_create(
            user=request.user,
            location=location,
        )
        if not created:
            save_obj.delete()
            saved = False
        else:
            saved = True

        return Response(
            {
                "saved": saved,
                "detail": "Saved for later." if saved else "Removed from saved.",
                "location_id": location.id,
            }
        )


class SavedTossesView(APIView):
    """List spots the current user saved from coin toss."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = (
            TossLocation.objects.filter(saves__user=request.user, is_excluded=False)
            .annotate(upvote_count=Count("votes", distinct=True))
            .annotate(commercial_flag_count=Count("commercial_flags", distinct=True))
            .annotate(
                saved_by_me=Exists(
                    TossLocationSave.objects.filter(
                        location_id=OuterRef("pk"),
                        user_id=request.user.id,
                    )
                )
            )
            .order_by("-saves__created_at")
            .distinct()
        )
        return Response(TossLocationSerializer(qs, many=True, context={"request": request}).data)
