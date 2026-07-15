from django.urls import path



from promotions.views import (

    CategorySpotlightView,

    FeaturedEventsView,

    FeaturedFoodView,

    FeaturedGuidesView,

    FeaturedStaysView,

    PromotionPricingView,

    PromotionProductsView,

    PromotionPurchaseView,

    PromotionTrackView,

    ProviderPromotionAnalyticsView,

    ProviderPromotionCampaignView,

    ProviderPromotionListingsView,

    ProviderPromotionReceiptView,

    ProviderPromotionRequestView,

    ProviderPromotionsView,

)



urlpatterns = [

    path("featured/stays/", FeaturedStaysView.as_view(), name="featured-stays"),

    path("featured/guides/", FeaturedGuidesView.as_view(), name="featured-guides"),

    path("featured/food/", FeaturedFoodView.as_view(), name="featured-food"),

    path("featured/events/", FeaturedEventsView.as_view(), name="featured-events"),

    path("spotlight/<str:category>/", CategorySpotlightView.as_view(), name="category-spotlight"),

    path("track/", PromotionTrackView.as_view(), name="promotion-track"),

    path("my/analytics/", ProviderPromotionAnalyticsView.as_view(), name="provider-promotion-analytics"),

    path("my/", ProviderPromotionsView.as_view(), name="provider-promotions"),

    path("requests/", ProviderPromotionRequestView.as_view(), name="provider-promotion-request"),

    path("provider/listings/", ProviderPromotionListingsView.as_view(), name="provider-promotion-listings"),

    path("products/", PromotionProductsView.as_view(), name="promotion-products"),

    path("purchase/", PromotionPurchaseView.as_view(), name="promotion-purchase"),

    path("campaigns/<int:pk>/", ProviderPromotionCampaignView.as_view(), name="provider-promotion-campaign"),

    path("campaigns/<int:pk>/receipt/", ProviderPromotionReceiptView.as_view(), name="provider-promotion-receipt"),

    path("pricing/", PromotionPricingView.as_view(), name="promotion-pricing"),

]
