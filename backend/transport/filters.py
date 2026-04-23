import django_filters

from .models import BusTrip, VehicleRentalListing


class VehicleFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price_per_day", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price_per_day", lookup_expr="lte")

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

    class Meta:
        model = BusTrip
        fields = ["is_active"]
