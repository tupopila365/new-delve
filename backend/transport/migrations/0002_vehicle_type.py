from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("transport", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="vehiclerentallisting",
            name="vehicle_type",
            field=models.CharField(
                blank=True,
                default="",
                max_length=40,
                help_text="e.g. 4x4, sedan, van — used for filters",
            ),
        ),
    ]
