# Generated manually for ExplorePlacePin (Phase 3 hybrid polish)

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("accounts", "0021_place_signal"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExplorePlacePin",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("country_code", models.CharField(db_index=True, max_length=2)),
                ("label", models.CharField(max_length=120)),
                ("region", models.CharField(blank=True, max_length=120)),
                ("latitude", models.DecimalField(decimal_places=6, max_digits=9)),
                ("longitude", models.DecimalField(decimal_places=6, max_digits=9)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="explore_place_pins_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["country_code", "sort_order", "id"],
                "indexes": [
                    models.Index(
                        fields=["country_code", "is_active", "sort_order"],
                        name="accounts_ex_country_pin_idx",
                    ),
                ],
            },
        ),
    ]
