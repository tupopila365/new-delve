from django.conf import settings
from django.db import models

from accommodation.models import BookingStatus


class VehicleRentalListing(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vehicle_listings",
    )
    title = models.CharField(max_length=200)
    make = models.CharField(max_length=80)
    model = models.CharField(max_length=80)
    year = models.PositiveSmallIntegerField(default=2020)
    transmission = models.CharField(max_length=40, default="automatic")
    seats = models.PositiveSmallIntegerField(default=5)
    price_per_day = models.DecimalField(max_digits=10, decimal_places=2)
    region = models.CharField(max_length=120)
    city = models.CharField(max_length=120, blank=True)
    vehicle_type = models.CharField(
        max_length=40,
        blank=True,
        default="",
        help_text="e.g. 4x4, sedan, van — used for filters",
    )
    description = models.TextField(blank=True)
    pickup_location = models.CharField(
        max_length=400,
        blank=True,
        help_text="Where the renter collects the vehicle",
    )
    included_features = models.JSONField(
        default=list,
        blank=True,
        help_text='List of short labels, e.g. ["Airport pickup", "Full insurance"]',
    )
    gallery_images = models.JSONField(
        default=list,
        blank=True,
        help_text="List of image URLs or relative media paths",
    )
    cover_image = models.ImageField(upload_to="vehicles/", blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class VehicleRentalBooking(models.Model):
    listing = models.ForeignKey(
        VehicleRentalListing,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    renter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vehicle_bookings",
    )
    start_date = models.DateField()
    end_date = models.DateField()
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
    )
    mock_payment_ref = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class BusOperator(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bus_operators",
    )
    name = models.CharField(max_length=200)
    contact_phone = models.CharField(max_length=40, blank=True)
    region = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class BusRoute(models.Model):
    operator = models.ForeignKey(
        BusOperator,
        on_delete=models.CASCADE,
        related_name="routes",
    )
    origin = models.CharField(max_length=120)
    destination = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    cover_image = models.URLField(
        max_length=500,
        blank=True,
        help_text="Optional coach or route photo URL for listings.",
    )
    gallery_images = models.JSONField(
        default=list,
        blank=True,
        help_text="Optional list of interior/route image URLs for trip detail gallery.",
    )

    def __str__(self):
        return f"{self.origin} → {self.destination}"


class BusTrip(models.Model):
    route = models.ForeignKey(
        BusRoute,
        on_delete=models.CASCADE,
        related_name="trips",
    )
    departs_at = models.DateTimeField()
    arrives_at = models.DateTimeField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    total_seats = models.PositiveSmallIntegerField(default=40)
    amenities = models.JSONField(
        default=list,
        blank=True,
        help_text='e.g. ["Air conditioning", "Onboard toilet", "WiFi"]',
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["departs_at"]


class SeatReservation(models.Model):
    trip = models.ForeignKey(
        BusTrip,
        on_delete=models.CASCADE,
        related_name="reservations",
    )
    passenger = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bus_reservations",
    )
    seat_number = models.PositiveSmallIntegerField()
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
    )
    mock_payment_ref = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["trip", "seat_number"]]
