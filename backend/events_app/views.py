import django_filters
from django.db.models import Q
from rest_framework import permissions, viewsets

from .models import Event
from .serializers import EventSerializer


class EventFilter(django_filters.FilterSet):
    from_date = django_filters.IsoDateTimeFilter(field_name="starts_at", lookup_expr="gte")
    to_date = django_filters.IsoDateTimeFilter(field_name="starts_at", lookup_expr="lte")
    organizer = django_filters.CharFilter(field_name="organizer__username", lookup_expr="iexact")

    class Meta:
        model = Event
        fields = ["category", "region", "city", "is_published", "organizer"]


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.filter(is_published=True).select_related("organizer", "organizer__profile")
    serializer_class = EventSerializer
    filterset_class = EventFilter
    search_fields = ("title", "description", "venue", "region", "city")
    ordering_fields = ("starts_at", "created_at")
    ordering = ["starts_at"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        base = Event.objects.select_related("organizer", "organizer__profile")
        if self.action in ("update", "partial_update", "destroy"):
            return base.filter(organizer=self.request.user)

        mine = self.request.query_params.get("mine", "").strip().lower() in ("1", "true", "yes")
        if mine and self.request.user.is_authenticated:
            return base.filter(organizer=self.request.user)

        if self.action == "retrieve" and self.request.user.is_authenticated:
            return base.filter(Q(is_published=True) | Q(organizer=self.request.user))

        return base.filter(is_published=True)
