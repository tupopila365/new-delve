# Generated manually for PopularPlace

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0019_pending_registration"),
    ]

    operations = [
        migrations.CreateModel(
            name="PopularPlace",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("country_code", models.CharField(db_index=True, max_length=2)),
                ("label", models.CharField(max_length=120)),
                ("region", models.CharField(blank=True, max_length=120)),
                ("latitude", models.DecimalField(decimal_places=6, max_digits=9)),
                ("longitude", models.DecimalField(decimal_places=6, max_digits=9)),
                ("score", models.PositiveIntegerField(default=0)),
                ("listing_count", models.PositiveIntegerField(default=0)),
                ("booking_count", models.PositiveIntegerField(default=0)),
                ("rank", models.PositiveSmallIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["country_code", "rank", "-score"],
                "indexes": [
                    models.Index(fields=["country_code", "rank"], name="accounts_po_country_0b2f1a_idx"),
                ],
                "unique_together": {("country_code", "label")},
            },
        ),
    ]
