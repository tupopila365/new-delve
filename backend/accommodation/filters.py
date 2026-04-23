import django_filters

from .models import AccommodationListing


class AccommodationListingFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price_per_night", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price_per_night", lookup_expr="lte")
    guests = django_filters.NumberFilter(field_name="max_guests", lookup_expr="gte")
    min_rating = django_filters.NumberFilter(field_name="rating_avg", lookup_expr="gte")
    min_bedrooms = django_filters.NumberFilter(field_name="bedrooms", lookup_expr="gte")
    max_bedrooms = django_filters.NumberFilter(field_name="bedrooms", lookup_expr="lte")
    city = django_filters.CharFilter(field_name="city", lookup_expr="icontains")
    property_type = django_filters.MultipleChoiceFilter(choices=AccommodationListing.PropertyType.choices)
    pet_friendly = django_filters.BooleanFilter()
    wifi = django_filters.BooleanFilter()
    parking = django_filters.BooleanFilter()
    pool = django_filters.BooleanFilter()
    kitchen = django_filters.BooleanFilter()
    breakfast = django_filters.BooleanFilter()

    class Meta:
        model = AccommodationListing
        fields = ["region", "is_active"]
