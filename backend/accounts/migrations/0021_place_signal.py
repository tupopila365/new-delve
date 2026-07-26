# Generated manually for PlaceSignal + PopularPlace signal counts

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0020_popular_place"),
    ]

    operations = [
        migrations.AddField(
            model_name="popularplace",
            name="chip_click_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="popularplace",
            name="search_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.CreateModel(
            name="PlaceSignal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("country_code", models.CharField(db_index=True, max_length=2)),
                ("label", models.CharField(max_length=120)),
                (
                    "kind",
                    models.CharField(
                        choices=[
                            ("chip_click", "Chip click"),
                            ("search", "Search / free-text"),
                            ("near_point", "Place / map pick"),
                        ],
                        db_index=True,
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["country_code", "kind", "-created_at"], name="accounts_pl_country_sig_idx"),
                    models.Index(fields=["country_code", "label", "-created_at"], name="accounts_pl_country_lbl_idx"),
                ],
            },
        ),
    ]
