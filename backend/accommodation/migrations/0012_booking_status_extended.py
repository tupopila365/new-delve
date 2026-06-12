from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accommodation", "0011_listing_likes"),
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
                    ("refunded", "Refunded"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
    ]
