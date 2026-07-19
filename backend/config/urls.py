from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/accounts/", include("accounts.urls")),
    path("api/social/", include("social.urls")),
    path("api/accommodation/", include("accommodation.urls")),
    path("api/transport/", include("transport.urls")),
    path("api/events/", include("events_app.urls")),
    path("api/food/", include("food.urls")),
    path("api/shop/", include("shop.urls")),
    path("api/coin-toss/", include("coin_toss.urls")),
    path("api/guides/", include("guides.urls")),
    path("api/messaging/", include("messaging.urls")),
    path("api/reports/", include("reports.urls")),
    path("api/promotions/", include("promotions.urls")),
    path("api/journeys/", include("journeys.urls")),
    path("api/highlights/", include("highlights.urls")),
    path("api/communities/", include("communities.urls")),
    path("api/tags/", include("tags.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/search/", include("config.search_urls")),
    path("api/home/", include("config.home_urls")),
]

if settings.DEBUG or settings.SERVE_LOCAL_MEDIA:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
