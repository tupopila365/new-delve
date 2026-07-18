from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("transport", "0011_remove_transport_qa"),
    ]

    operations = [
        migrations.AddField(
            model_name="vehiclerentallisting",
            name="highlights",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Provider-written selling points, e.g. ["Great on gravel", "Automatic"]',
            ),
        ),
        migrations.AddField(
            model_name="vehiclerentallisting",
            name="rental_rules",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Provider-set rental rules, e.g. ["Valid licence required", "No smoking"]',
            ),
        ),
        migrations.AddField(
            model_name="busroute",
            name="stops",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Ordered intermediate stop names between origin and destination.",
            ),
        ),
        migrations.AddField(
            model_name="busroute",
            name="travel_tips",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Provider-set boarding/travel tips shown to passengers.",
            ),
        ),
    ]
