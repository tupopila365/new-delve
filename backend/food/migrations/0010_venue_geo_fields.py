from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("food", "0009_venue_shell_and_hours_json"),
    ]

    operations = [
        migrations.AddField(
            model_name="foodvenue",
            name="latitude",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name="foodvenue",
            name="longitude",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name="foodvenue",
            name="google_place_id",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="foodvenue",
            name="formatted_address",
            field=models.CharField(blank=True, max_length=500),
        ),
    ]
