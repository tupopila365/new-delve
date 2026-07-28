from decimal import Decimal, InvalidOperation

import django.db.models.deletion
from django.db import migrations, models


def _decimal(value, fallback):
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return fallback
    return amount if amount >= 0 else fallback


def _positive_int(value, fallback):
    try:
        number = int(value)
    except (TypeError, ValueError):
        return fallback
    return number if number > 0 else fallback


def migrate_room_json(apps, schema_editor):
    Listing = apps.get_model("accommodation", "AccommodationListing")
    RoomType = apps.get_model("accommodation", "AccommodationRoomType")
    Booking = apps.get_model("accommodation", "AccommodationBooking")
    Business = apps.get_model("accounts", "BusinessProfile")

    for listing in Listing.objects.all().iterator():
        businesses = list(Business.objects.filter(owner_id=listing.owner_id).order_by("id"))
        accommodation_business = next(
            (
                business
                for business in businesses
                if "accommodation" in (business.business_types or [])
            ),
            businesses[0] if businesses else None,
        )
        if accommodation_business:
            listing.business_id = accommodation_business.id
            listing.save(update_fields=["business"])

        rooms_by_name = {}
        for index, row in enumerate(listing.room_types or []):
            if not isinstance(row, dict):
                continue
            name = str(row.get("name") or "").strip()
            if not name:
                continue
            badges = row.get("badges")
            if not isinstance(badges, list):
                legacy_badge = str(row.get("badge") or row.get("special_label") or "").strip()
                badges = [legacy_badge] if legacy_badge else []
            images = row.get("images") or row.get("gallery") or row.get("photos") or []
            if not isinstance(images, list):
                images = []
            image = str(row.get("image") or row.get("photo") or "").strip()
            if image and image not in images:
                images = [image, *images]

            price = _decimal(row.get("price_per_night"), listing.price_per_night)
            compare_at = _decimal(
                row.get("compare_at_price")
                or row.get("was_price")
                or row.get("original_price"),
                None,
            )
            if compare_at is not None and compare_at <= price:
                compare_at = None

            room = RoomType.objects.create(
                listing_id=listing.id,
                name=name,
                description=str(row.get("description") or "").strip(),
                quantity_available=_positive_int(
                    row.get("quantity_available", row.get("quantity", 1)),
                    1,
                ),
                max_guests=_positive_int(row.get("max_guests"), listing.max_guests or 2),
                bedrooms=_positive_int(row.get("bedrooms"), listing.bedrooms or 1),
                bed_summary=str(row.get("bed_summary") or "").strip(),
                price_per_night=price,
                compare_at_price=compare_at,
                badges=[str(item).strip() for item in badges if str(item).strip()][:8],
                featured=bool(row.get("featured") or row.get("is_featured")),
                image=image,
                images=[str(item).strip() for item in images if str(item).strip()],
                is_active=True,
                sort_order=index,
            )
            rooms_by_name.setdefault(name.casefold(), []).append(room)

        for booking in Booking.objects.filter(listing_id=listing.id, room_type_id__isnull=True):
            name = (booking.room_type_name or "").strip().casefold()
            matches = rooms_by_name.get(name, [])
            if len(matches) == 1:
                booking.room_type_id = matches[0].id
                booking.save(update_fields=["room_type"])


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0022_explore_place_pin"),
        ("accommodation", "0026_page_views"),
    ]

    operations = [
        migrations.AddField(
            model_name="accommodationlisting",
            name="business",
            field=models.ForeignKey(
                blank=True,
                help_text="Business that operates this property.",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="accommodation_properties",
                to="accounts.businessprofile",
            ),
        ),
        migrations.CreateModel(
            name="AccommodationRoomType",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                (
                    "quantity_available",
                    models.PositiveSmallIntegerField(
                        default=1,
                        help_text="Number of interchangeable rooms/units available for this category.",
                    ),
                ),
                ("max_guests", models.PositiveSmallIntegerField(default=2)),
                ("bedrooms", models.PositiveSmallIntegerField(default=1)),
                ("bed_summary", models.CharField(blank=True, max_length=200)),
                ("price_per_night", models.DecimalField(decimal_places=2, max_digits=10)),
                (
                    "compare_at_price",
                    models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
                ),
                ("badges", models.JSONField(blank=True, default=list)),
                ("featured", models.BooleanField(default=False)),
                ("image", models.TextField(blank=True, default="")),
                ("images", models.JSONField(blank=True, default=list)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "listing",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="room_type_records",
                        to="accommodation.accommodationlisting",
                    ),
                ),
            ],
            options={"ordering": ["sort_order", "id"]},
        ),
        migrations.CreateModel(
            name="AccommodationAvailability",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(db_index=True)),
                ("is_available", models.BooleanField(default=True)),
                (
                    "quantity_available",
                    models.PositiveSmallIntegerField(
                        blank=True,
                        help_text="Optional inventory override for this date.",
                        null=True,
                    ),
                ),
                (
                    "price_override",
                    models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
                ),
                ("note", models.CharField(blank=True, max_length=200)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "listing",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="availability_calendar",
                        to="accommodation.accommodationlisting",
                    ),
                ),
                (
                    "room_type",
                    models.ForeignKey(
                        blank=True,
                        help_text="Empty applies the override to the whole property.",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="availability_calendar",
                        to="accommodation.accommodationroomtype",
                    ),
                ),
            ],
            options={"ordering": ["date", "room_type_id"]},
        ),
        migrations.AddField(
            model_name="accommodationbooking",
            name="room_type",
            field=models.ForeignKey(
                blank=True,
                help_text="Stable room type selected for this booking.",
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="bookings",
                to="accommodation.accommodationroomtype",
            ),
        ),
        migrations.AlterField(
            model_name="accommodationbooking",
            name="room_type_name",
            field=models.CharField(
                blank=True,
                help_text="Snapshot of the room type name at booking time.",
                max_length=200,
            ),
        ),
        migrations.AddIndex(
            model_name="accommodationroomtype",
            index=models.Index(fields=["listing", "is_active"], name="acc_room_listing_active_idx"),
        ),
        migrations.AddIndex(
            model_name="accommodationavailability",
            index=models.Index(fields=["listing", "date"], name="acc_avail_listing_date_idx"),
        ),
        migrations.AddIndex(
            model_name="accommodationavailability",
            index=models.Index(fields=["room_type", "date"], name="acc_avail_room_date_idx"),
        ),
        migrations.AddConstraint(
            model_name="accommodationavailability",
            constraint=models.UniqueConstraint(
                condition=models.Q(("room_type__isnull", True)),
                fields=("listing", "date"),
                name="accommodation_property_day_unique",
            ),
        ),
        migrations.AddConstraint(
            model_name="accommodationavailability",
            constraint=models.UniqueConstraint(
                condition=models.Q(("room_type__isnull", False)),
                fields=("room_type", "date"),
                name="accommodation_room_day_unique",
            ),
        ),
        migrations.RunPython(migrate_room_json, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="accommodationlisting",
            name="room_types",
        ),
    ]
