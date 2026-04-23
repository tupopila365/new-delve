from django.db import migrations, models


def sync_flags(apps, schema_editor):
    AccommodationListing = apps.get_model("accommodation", "AccommodationListing")
    for obj in AccommodationListing.objects.all():
        tags = {str(x).lower().strip() for x in (obj.amenities or []) if x is not None}
        AccommodationListing.objects.filter(pk=obj.pk).update(
            wifi="wifi" in tags,
            parking="parking" in tags,
            pool=any("pool" in t for t in tags),
            kitchen="kitchen" in tags,
            breakfast="breakfast" in tags,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("accommodation", "0003_add_rating_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="accommodationlisting",
            name="property_type",
            field=models.CharField(
                choices=[
                    ("hotel", "Hotel"),
                    ("guesthouse", "Guest house"),
                    ("bed_and_breakfast", "Bed & breakfast"),
                    ("apartment", "Apartment / flat"),
                    ("lodge", "Lodge"),
                    ("hostel", "Hostel"),
                    ("villa", "Villa / house"),
                    ("resort", "Resort"),
                    ("camping_glamping", "Camping / glamping"),
                    ("other", "Other"),
                ],
                db_index=True,
                default="guesthouse",
                max_length=32,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="accommodationlisting",
            name="pet_friendly",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="accommodationlisting",
            name="wifi",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="accommodationlisting",
            name="parking",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="accommodationlisting",
            name="pool",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="accommodationlisting",
            name="kitchen",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="accommodationlisting",
            name="breakfast",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.RunPython(sync_flags, migrations.RunPython.noop),
    ]
