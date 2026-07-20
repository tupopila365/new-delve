import django_filters
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsEmailVerified, IsServiceProvider

from .models import ShopProduct
from .review_serializers import ProductReviewCreateSerializer, ProductReviewSerializer
from .review_services import product_reviews_payload
from .serializers import ShopProductSerializer


class ShopProductFilter(django_filters.FilterSet):
    owner_username = django_filters.CharFilter(field_name="owner__username", lookup_expr="iexact")
    # Soft match: explore region must not hide national/shipping listings with blank region.
    region = django_filters.CharFilter(method="filter_region")
    city = django_filters.CharFilter(field_name="city", lookup_expr="icontains")

    class Meta:
        model = ShopProduct
        fields = [
            "category",
            "region",
            "city",
            "in_stock",
            "made_in_namibia",
            "is_featured",
            "owner_username",
        ]

    def filter_region(self, queryset, name, value):
        value = (value or "").strip()
        if not value:
            return queryset
        return queryset.filter(Q(region__icontains=value) | Q(region=""))


class ShopProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        ShopProduct.objects.filter(is_active=True)
        .select_related("owner", "owner__profile")
        .prefetch_related("variants")
    )
    serializer_class = ShopProductSerializer
    filterset_class = ShopProductFilter
    search_fields = ("name", "description", "tagline", "region", "city", "artisan_name", "pickup_address")
    ordering_fields = ("name", "created_at", "price")
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsServiceProvider()]
        if self.action == "review":
            return [permissions.IsAuthenticated(), IsEmailVerified()]
        return [permissions.AllowAny()]

    @action(detail=True, methods=["get"])
    def reviews(self, request, pk=None):
        product = self.get_object()
        return Response(product_reviews_payload(product, request))

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        product = self.get_object()
        ser = ProductReviewCreateSerializer(
            data=request.data,
            context={"request": request, "product": product},
        )
        ser.is_valid(raise_exception=True)
        review = ser.save()
        return Response(
            ProductReviewSerializer(review, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
