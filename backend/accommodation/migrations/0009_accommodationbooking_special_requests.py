from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accommodation", "0008_accommodationlisting_room_types"),
    ]

    operations = [
        migrations.AddField(
            model_name="accommodationbooking",
            name="special_requests",
            field=models.TextField(blank=True),
        ),
    ]
