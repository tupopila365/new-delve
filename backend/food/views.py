import django_filters
from rest_framework import permissions, viewsets

from .models import FoodVenue
from .serializers import FoodVenueSerializer


class FoodVenueFilter(django_filters.FilterSet):
    min_price_level = django_filters.NumberFilter(field_name="price_level", lookup_expr="gte")
    max_price_level = django_filters.NumberFilter(field_name="price_level", lookup_expr="lte")

    class Meta:
        model = FoodVenue
        fields = ["cuisine", "region", "city", "is_active"]


class FoodVenueViewSet(viewsets.ModelViewSet):
    queryset = FoodVenue.objects.filter(is_active=True).select_related("owner")
    serializer_class = FoodVenueSerializer
    filterset_class = FoodVenueFilter
    search_fields = ("name", "description", "region", "city")
    ordering_fields = ("name", "created_at")
    ordering = ["name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        if self.action in ("update", "partial_update", "destroy"):
            return FoodVenue.objects.filter(owner=self.request.user)
        return super().get_queryset()
