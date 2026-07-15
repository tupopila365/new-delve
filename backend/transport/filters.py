import django_filters
from datetime import timedelta

from django.utils import timezone

from .models import BusTrip, VehicleRentalListing


class VehicleFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price_per_day", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price_per_day", lookup_expr="lte")
    min_seats = django_filters.NumberFilter(field_name="seats", lookup_expr="gte")
    max_seats = django_filters.NumberFilter(field_name="seats", lookup_expr="lte")

    class Meta:
        model = VehicleRentalListing
        fields = ["region", "city", "transmission", "is_active"]


class BusTripFilter(django_filters.FilterSet):
    route_origin = django_filters.CharFilter(field_name="route__origin", lookup_expr="icontains")
    route_destination = django_filters.CharFilter(
        field_name="route__destination", lookup_expr="icontains"
    )
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    travel_date = django_filters.DateFilter(method="filter_travel_date")
    departing_within_days = django_filters.NumberFilter(method="filter_departing_within_days")

    class Meta:
        model = BusTrip
        fields = ["is_active"]

    def filter_travel_date(self, queryset, name, value):
        if value is None:
            return queryset
        return queryset.filter(departs_at__date=value)

    def filter_departing_within_days(self, queryset, name, value):
        try:
            days = int(value)
        except (TypeError, ValueError):
            return queryset
        if days < 1:
            return queryset
        now = timezone.now()
        return queryset.filter(departs_at__gte=now, departs_at__lte=now + timedelta(days=days))
