import django_filters
from rest_framework import permissions, viewsets

from accounts.permissions import IsServiceProvider

from .models import ShopProduct
from .serializers import ShopProductSerializer


class ShopProductFilter(django_filters.FilterSet):
    owner_username = django_filters.CharFilter(field_name="owner__username", lookup_expr="iexact")

    class Meta:
        model = ShopProduct
        fields = ["category", "region", "city", "in_stock", "made_in_namibia", "owner_username"]


class ShopProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ShopProduct.objects.filter(is_active=True).select_related("owner", "owner__profile")
    serializer_class = ShopProductSerializer
    filterset_class = ShopProductFilter
    search_fields = ("name", "description", "tagline", "region", "city", "artisan_name", "pickup_address")
    ordering_fields = ("name", "created_at", "price")
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsServiceProvider()]
        return [permissions.AllowAny()]
