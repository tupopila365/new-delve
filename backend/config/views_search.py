from django.db.models import Q
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accommodation.models import AccommodationListing
from accommodation.serializers import AccommodationListingSerializer
from events_app.models import Event
from events_app.serializers import EventSerializer
from food.models import FoodVenue
from food.serializers import FoodVenueSerializer
from guides.models import TourGuideProfile
from guides.serializers import TourGuideProfileSerializer
from social.models import Post
from social.serializers import PostSerializer
from transport.models import BusTrip, VehicleRentalListing
from transport.serializers import BusTripSerializer, VehicleRentalListingSerializer


class UnifiedSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response(
                {
                    "accommodation": [],
                    "vehicles": [],
                    "bus_trips": [],
                    "events": [],
                    "food": [],
                    "guides": [],
                    "posts": [],
                }
            )
        acc = AccommodationListing.objects.filter(is_active=True).filter(
            Q(title__icontains=q) | Q(description__icontains=q) | Q(region__icontains=q) | Q(city__icontains=q)
        )[:8]
        veh = VehicleRentalListing.objects.filter(is_active=True).filter(
            Q(title__icontains=q) | Q(make__icontains=q) | Q(model__icontains=q) | Q(region__icontains=q)
        )[:8]
        trips = (
            BusTrip.objects.filter(is_active=True)
            .select_related("route")
            .filter(
                Q(route__origin__icontains=q)
                | Q(route__destination__icontains=q)
                | Q(route__operator__name__icontains=q)
            )[:8]
        )
        events = Event.objects.filter(is_published=True).filter(
            Q(title__icontains=q) | Q(venue__icontains=q) | Q(region__icontains=q) | Q(description__icontains=q)
        )[:8]
        food = FoodVenue.objects.filter(is_active=True).filter(
            Q(name__icontains=q) | Q(description__icontains=q) | Q(region__icontains=q)
        )[:8]
        guides = TourGuideProfile.objects.filter(is_active=True).filter(
            Q(headline__icontains=q) | Q(bio__icontains=q)
        )[:8]
        posts = Post.objects.filter(Q(body__icontains=q) | Q(region__icontains=q))[:8]

        return Response(
            {
                "accommodation": AccommodationListingSerializer(
                    acc, many=True, context={"request": request}
                ).data,
                "vehicles": VehicleRentalListingSerializer(
                    veh, many=True, context={"request": request}
                ).data,
                "bus_trips": BusTripSerializer(trips, many=True, context={"request": request}).data,
                "events": EventSerializer(events, many=True, context={"request": request}).data,
                "food": FoodVenueSerializer(food, many=True, context={"request": request}).data,
                "guides": TourGuideProfileSerializer(guides, many=True, context={"request": request}).data,
                "posts": PostSerializer(posts, many=True, context={"request": request}).data,
            }
        )
