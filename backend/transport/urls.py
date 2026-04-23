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

router = DefaultRouter()
router.register(r"vehicles", VehicleRentalListingViewSet, basename="vehicle")
router.register(r"vehicle-bookings", VehicleRentalBookingViewSet, basename="vehicle-booking")
router.register(r"bus/operators", BusOperatorViewSet, basename="bus-operator")
router.register(r"bus/routes", BusRouteViewSet, basename="bus-route")
router.register(r"bus/trips", BusTripViewSet, basename="bus-trip")
router.register(r"bus/reservations", SeatReservationViewSet, basename="bus-reservation")

urlpatterns = [path("", include(router.urls))]
