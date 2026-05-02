from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accommodation", "0009_accommodationbooking_special_requests"),
    ]

    operations = [
        migrations.AddField(
            model_name="accommodationbooking",
            name="room_type_name",
            field=models.CharField(
                blank=True,
                help_text="Selected room/unit category from the listing's room_types JSON, if any.",
                max_length=200,
            ),
        ),
    ]
