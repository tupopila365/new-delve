from django.contrib import admin

from .models import (
    BusOperator,
    BusRoute,
    BusTrip,
    SeatReservation,
    VehicleRentalBooking,
    VehicleRentalListing,
)

admin.site.register(VehicleRentalListing)
admin.site.register(VehicleRentalBooking)
admin.site.register(BusOperator)
admin.site.register(BusRoute)
admin.site.register(BusTrip)
admin.site.register(SeatReservation)
