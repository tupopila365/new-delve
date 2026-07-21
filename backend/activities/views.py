"""Public activity catalog."""

import django_filters
from django.db.models import Count, Exists, OuterRef, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsEmailVerified

from .models import ActivityListing, ActivitySave
from .review_serializers import ActivityReviewCreateSerializer, ActivityReviewSerializer
from .review_services import activity_reviews_payload
from .serializers import ActivityListingSerializer


class ActivityListingFilter(django_filters.FilterSet):
    owner_username = django_filters.CharFilter(field_name="owner__username", lookup_expr="iexact")
    region = django_filters.CharFilter(method="filter_region")
    country_code = django_filters.CharFilter(field_name="country_code", lookup_expr="iexact")
    city = django_filters.CharFilter(field_name="city", lookup_expr="icontains")

    class Meta:
        model = ActivityListing
        fields = [
            "category",
            "region",
            "city",
            "country_code",
            "is_featured",
            "owner_username",
        ]

    def filter_region(self, queryset, name, value):
        value = (value or "").strip()
        if not value:
            return queryset
        return queryset.filter(Q(region__icontains=value) | Q(region=""))


class ActivityListingViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityListingSerializer
    filterset_class = ActivityListingFilter
    search_fields = (
        "title",
        "description",
        "tagline",
        "region",
        "city",
        "meeting_point",
        "country_code",
    )
    ordering_fields = ("title", "created_at", "price_from", "duration_hours", "rating_avg")
    ordering = ["-is_featured", "-created_at"]

    def get_permissions(self):
        if self.action == "review":
            return [permissions.IsAuthenticated(), IsEmailVerified()]
        if self.action in ("save", "saved"):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def _annotate_engagement(self, qs, user):
        qs = qs.annotate(saves_count=Count("user_saves", distinct=True))
        if user and getattr(user, "is_authenticated", False):
            qs = qs.annotate(
                saved_by_me=Exists(
                    ActivitySave.objects.filter(listing_id=OuterRef("pk"), user=user)
                )
            )
        return qs

    def get_queryset(self):
        user = self.request.user
        qs = ActivityListing.objects.filter(is_active=True).select_related(
            "owner", "owner__profile"
        )
        if self.action == "saved":
            qs = qs.filter(user_saves__user=user)
        return self._annotate_engagement(qs, user)

    @action(detail=True, methods=["post"])
    def save(self, request, pk=None):
        listing = self.get_object()
        save_obj, created = ActivitySave.objects.get_or_create(
            listing=listing, user=request.user
        )
        if not created:
            save_obj.delete()
            saved = False
        else:
            saved = True
        saves_count = ActivitySave.objects.filter(listing=listing).count()
        return Response({"saved": saved, "saves_count": saves_count})

    @action(detail=False, methods=["get"])
    def saved(self, request):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def reviews(self, request, pk=None):
        listing = self.get_object()
        return Response(activity_reviews_payload(listing, request))

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        listing = self.get_object()
        ser = ActivityReviewCreateSerializer(
            data=request.data,
            context={"request": request, "listing": listing},
        )
        ser.is_valid(raise_exception=True)
        review = ser.save()
        return Response(
            ActivityReviewSerializer(review, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
