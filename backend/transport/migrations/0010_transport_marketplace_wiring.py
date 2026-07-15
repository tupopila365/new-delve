# Generated manually for transport marketplace wiring

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("transport", "0009_transport_video_covers"),
    ]

    operations = [
        migrations.AddField(
            model_name="vehiclerentallisting",
            name="fuel_type",
            field=models.CharField(
                blank=True,
                default="",
                help_text="e.g. diesel, petrol, hybrid, electric",
                max_length=40,
            ),
        ),
        migrations.AddField(
            model_name="vehiclerentallisting",
            name="required_renter_documents",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Document type ids required at booking, e.g. ["driver_license_front"]',
            ),
        ),
        migrations.AddField(
            model_name="vehiclerentalbooking",
            name="pickup_area",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Preferred pickup area chosen by the renter.",
                max_length=200,
            ),
        ),
        migrations.AddField(
            model_name="vehiclerentalbooking",
            name="renter_documents",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Uploaded document metadata from the renter at booking time.",
            ),
        ),
        migrations.AddField(
            model_name="busroute",
            name="distance_km",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Approximate road distance for this corridor.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="busroute",
            name="duration_minutes",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Typical travel duration in minutes.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="bustrip",
            name="rating_avg",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=3),
        ),
        migrations.AddField(
            model_name="bustrip",
            name="rating_count",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
