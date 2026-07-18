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
    highlights = models.JSONField(
        default=list,
        blank=True,
        help_text='Provider-written selling points, e.g. ["Great on gravel", "Automatic"]',
    )
    rental_rules = models.JSONField(
        default=list,
        blank=True,
        help_text='Provider-set rental rules, e.g. ["Valid licence required", "No smoking"]',
    )
    gallery_images = models.JSONField(
        default=list,
        blank=True,
        help_text='List of media URLs or {"url","kind"} objects (image/video)',
    )
    cover_image = models.TextField(
        blank=True,
        default="",
        help_text="Cover photo or video URL / storage path.",
    )
    cover_kind = models.CharField(
        max_length=16,
        choices=[("image", "Image"), ("video", "Video")],
        default="image",
        help_text="Whether cover_image is a still or a short video.",
    )
    fuel_type = models.CharField(
        max_length=40,
        blank=True,
        default="",
        help_text="e.g. diesel, petrol, hybrid, electric",
    )
    required_renter_documents = models.JSONField(
        default=list,
        blank=True,
        help_text='Document type ids required at booking, e.g. ["driver_license_front"]',
    )
    is_active = models.BooleanField(default=True)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    rating_count = models.PositiveIntegerField(default=0)
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
    pickup_area = models.CharField(
        max_length=200,
        blank=True,
        default="",
        help_text="Preferred pickup area chosen by the renter.",
    )
    renter_documents = models.JSONField(
        default=list,
        blank=True,
        help_text="Uploaded document metadata from the renter at booking time.",
    )
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
    cover_image = models.TextField(
        blank=True,
        default="",
        help_text="Optional coach or route photo/video URL for listings.",
    )
    cover_kind = models.CharField(
        max_length=16,
        choices=[("image", "Image"), ("video", "Video")],
        default="image",
        help_text="Whether cover_image is a still or a short video.",
    )
    gallery_images = models.JSONField(
        default=list,
        blank=True,
        help_text='Optional list of interior/route media URLs or {"url","kind"} objects.',
    )
    stops = models.JSONField(
        default=list,
        blank=True,
        help_text='Ordered intermediate stop names between origin and destination.',
    )
    travel_tips = models.JSONField(
        default=list,
        blank=True,
        help_text='Provider-set boarding/travel tips shown to passengers.',
    )
    distance_km = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Approximate road distance for this corridor.",
    )
    duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Typical travel duration in minutes.",
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
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    rating_count = models.PositiveIntegerField(default=0)

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


class VehicleRentalReview(models.Model):
    listing = models.ForeignKey(
        VehicleRentalListing,
        on_delete=models.CASCADE,
        related_name="traveler_reviews",
    )
    booking = models.OneToOneField(
        VehicleRentalBooking,
        on_delete=models.CASCADE,
        related_name="review",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vehicle_rental_reviews",
    )
    rating = models.PositiveSmallIntegerField()
    body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name="vehicle_review_rating_1_5",
            ),
        ]


class SeatReservationReview(models.Model):
    trip = models.ForeignKey(
        BusTrip,
        on_delete=models.CASCADE,
        related_name="traveler_reviews",
    )
    reservation = models.OneToOneField(
        SeatReservation,
        on_delete=models.CASCADE,
        related_name="review",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seat_reservation_reviews",
    )
    rating = models.PositiveSmallIntegerField()
    body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name="seat_review_rating_1_5",
            ),
        ]
