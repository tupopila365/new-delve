from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .commerce_views import (
    CartItemView,
    CartMergeView,
    CartView,
    OrderViewSet,
    ProviderOrderViewSet,
    SellerStorefrontView,
    ShopSellerListView,
)
from .provider_views import ProviderShopProductViewSet
from .views import ShopProductViewSet

router = DefaultRouter()
router.register(r"products", ShopProductViewSet, basename="shop-product")
router.register(r"provider-products", ProviderShopProductViewSet, basename="provider-shop-product")
router.register(r"orders", OrderViewSet, basename="shop-order")
router.register(r"provider-orders", ProviderOrderViewSet, basename="provider-shop-order")

urlpatterns = [
    path("cart/", CartView.as_view(), name="shop-cart"),
    path("cart/merge/", CartMergeView.as_view(), name="shop-cart-merge"),
    path("cart/items/<int:pk>/", CartItemView.as_view(), name="shop-cart-item"),
    path("sellers/", ShopSellerListView.as_view(), name="shop-seller-list"),
    path("sellers/<str:username>/", SellerStorefrontView.as_view(), name="shop-seller"),
    path("", include(router.urls)),
]
