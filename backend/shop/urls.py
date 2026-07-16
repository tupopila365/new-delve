from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .provider_views import ProviderShopProductViewSet
from .views import ShopProductViewSet

router = DefaultRouter()
router.register(r"products", ShopProductViewSet, basename="shop-product")
router.register(r"provider-products", ProviderShopProductViewSet, basename="provider-shop-product")

urlpatterns = [
    path("", include(router.urls)),
]
