from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BusOperatorViewSet,
    BusRouteViewSet,
    BusTripViewSet,
    SeatReservationViewSet,
    VehicleRentalBookingViewSet,
    VehicleRentalListingViewSet,
)
from .provider_booking_views import ProviderRentalBookingViewSet, ProviderSeatBookingViewSet
from .provider_views import (
    ProviderBusTripViewSet,
    ProviderVehicleViewSet,
)

router = DefaultRouter()
router.register(r"vehicles", VehicleRentalListingViewSet, basename="vehicle")
router.register(r"vehicle-bookings", VehicleRentalBookingViewSet, basename="vehicle-booking")
router.register(r"bus/operators", BusOperatorViewSet, basename="bus-operator")
router.register(r"bus/routes", BusRouteViewSet, basename="bus-route")
router.register(r"bus/trips", BusTripViewSet, basename="bus-trip")
router.register(r"bus/reservations", SeatReservationViewSet, basename="bus-reservation")
router.register(r"provider-vehicles", ProviderVehicleViewSet, basename="provider-vehicle")
router.register(r"provider-bus-trips", ProviderBusTripViewSet, basename="provider-bus-trip")
router.register(r"provider-rental-bookings", ProviderRentalBookingViewSet, basename="provider-rental-booking")
router.register(r"provider-seat-bookings", ProviderSeatBookingViewSet, basename="provider-seat-booking")

urlpatterns = [
    path("", include(router.urls)),
]
