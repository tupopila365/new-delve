import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("promotions", "0006_promotion_analytics"),
    ]

    operations = [
        migrations.CreateModel(
            name="HomePin",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("placement", models.CharField(db_index=True, max_length=40)),
                ("target_type", models.CharField(max_length=32)),
                ("target_id", models.CharField(max_length=64)),
                ("target_label", models.CharField(blank=True, max_length=255)),
                ("partner_label", models.CharField(blank=True, default="Featured", max_length=80)),
                ("region", models.CharField(blank=True, help_text="Blank = national.", max_length=120)),
                ("sort_order", models.PositiveSmallIntegerField(db_index=True, default=0)),
                ("starts_at", models.DateTimeField(blank=True, null=True)),
                ("ends_at", models.DateTimeField(blank=True, null=True)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="home_pins_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["placement", "sort_order", "id"],
            },
        ),
        migrations.AddIndex(
            model_name="homepin",
            index=models.Index(fields=["placement", "is_active", "sort_order"], name="promotions__placeme_home_pin_idx"),
        ),
    ]
