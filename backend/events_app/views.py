import django_filters
from rest_framework import permissions, viewsets

from .models import Event
from .serializers import EventSerializer


class EventFilter(django_filters.FilterSet):
    from_date = django_filters.IsoDateTimeFilter(field_name="starts_at", lookup_expr="gte")
    to_date = django_filters.IsoDateTimeFilter(field_name="starts_at", lookup_expr="lte")

    class Meta:
        model = Event
        fields = ["category", "region", "city", "is_published"]


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.filter(is_published=True).select_related("organizer")
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
        if self.action in ("update", "partial_update", "destroy"):
            return Event.objects.filter(organizer=self.request.user)
        return super().get_queryset()
