from datetime import timedelta
from decimal import Decimal

from django.db import migrations, models
from django.utils import timezone


def populate_booking_holds_and_snapshots(apps, schema_editor):
    Booking = apps.get_model("accommodation", "AccommodationBooking")
    Availability = apps.get_model("accommodation", "AccommodationAvailability")
    now = timezone.now()

    for booking in Booking.objects.select_related("listing", "room_type").iterator():
        listing = booking.listing
        room = booking.room_type
        base_rate = room.price_per_night if room else listing.price_per_night
        property_prices = {
            row.date: row.price_override
            for row in Availability.objects.filter(
                listing_id=listing.id,
                room_type_id__isnull=True,
                date__gte=booking.check_in,
                date__lt=booking.check_out,
                price_override__isnull=False,
            )
        }
        room_prices = {}
        if room:
            room_prices = {
                row.date: row.price_override
                for row in Availability.objects.filter(
                    room_type_id=room.id,
                    date__gte=booking.check_in,
                    date__lt=booking.check_out,
                    price_override__isnull=False,
                )
            }

        nightly_prices = []
        night = booking.check_in
        while night < booking.check_out:
            rate = room_prices.get(night, property_prices.get(night, base_rate))
            nightly_prices.append(
                {
                    "date": night.isoformat(),
                    "price": f"{Decimal(rate):.2f}",
                }
            )
            night += timedelta(days=1)

        room_snapshot = (
            {
                "id": room.id,
                "name": booking.room_type_name or room.name,
                "max_guests": room.max_guests,
                "bedrooms": room.bedrooms,
                "bed_summary": room.bed_summary,
                "quantity_available": room.quantity_available,
                "price_per_night": f"{room.price_per_night:.2f}",
            }
            if room
            else {
                "id": None,
                "name": booking.room_type_name or "",
                "max_guests": listing.max_guests,
                "bedrooms": listing.bedrooms,
                "price_per_night": f"{listing.price_per_night:.2f}",
            }
        )

        booking.listing_title_snapshot = listing.title
        booking.room_snapshot = room_snapshot
        booking.nightly_price_snapshot = nightly_prices
        fields = [
            "listing_title_snapshot",
            "room_snapshot",
            "nightly_price_snapshot",
        ]

        is_paid = bool(booking.paid_at or booking.mock_payment_ref)
        if booking.status == "pending" and not is_paid:
            deadline = booking.created_at + timedelta(hours=24)
            booking.hold_expires_at = deadline
            fields.append("hold_expires_at")
            if deadline <= now:
                booking.status = "expired"
                booking.expired_at = now
                fields.extend(["status", "expired_at"])
        elif booking.status == "confirmed" and not is_paid:
            booking.hold_expires_at = now + timedelta(minutes=30)
            fields.append("hold_expires_at")

        booking.save(update_fields=fields)


class Migration(migrations.Migration):
    dependencies = [
        ("accommodation", "0027_normalize_properties_rooms_availability"),
    ]

    operations = [
        migrations.AlterField(
            model_name="accommodationbooking",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("confirmed", "Confirmed"),
                    ("checked_in", "Checked in"),
                    ("checked_out", "Checked out"),
                    ("cancelled", "Cancelled"),
                    ("expired", "Expired"),
                    ("refunded", "Refunded"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="accommodationbooking",
            name="expired_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="accommodationbooking",
            name="hold_expires_at",
            field=models.DateTimeField(
                blank=True,
                db_index=True,
                help_text="When an unpaid pending or confirmed inventory hold is released.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="accommodationbooking",
            name="listing_title_snapshot",
            field=models.CharField(
                blank=True,
                help_text="Property title at the time this booking was created.",
                max_length=200,
            ),
        ),
        migrations.AddField(
            model_name="accommodationbooking",
            name="nightly_price_snapshot",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Immutable nightly rates: [{"date": "YYYY-MM-DD", "price": "0.00"}].',
            ),
        ),
        migrations.AddField(
            model_name="accommodationbooking",
            name="room_snapshot",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Immutable room details at the time this booking was created.",
            ),
        ),
        migrations.AddIndex(
            model_name="accommodationbooking",
            index=models.Index(
                fields=["status", "hold_expires_at"],
                name="acc_booking_hold_expiry_idx",
            ),
        ),
        migrations.RunPython(
            populate_booking_holds_and_snapshots,
            migrations.RunPython.noop,
        ),
    ]
