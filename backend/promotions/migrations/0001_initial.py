# Promotions campaigns

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_platform_settings"),
    ]

    operations = [
        migrations.CreateModel(
            name="PromotionCampaign",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "placement",
                    models.CharField(
                        choices=[("homepage_stays", "Homepage — Featured stays")],
                        max_length=40,
                    ),
                ),
                (
                    "target_type",
                    models.CharField(
                        choices=[
                            ("accommodation", "Stay listing"),
                            ("guide", "Guide profile"),
                            ("food", "Food venue"),
                            ("event", "Event"),
                            ("vehicle", "Vehicle rental"),
                            ("business", "Business profile"),
                            ("post", "Delvers post"),
                        ],
                        max_length=32,
                    ),
                ),
                ("target_id", models.CharField(max_length=64)),
                ("target_label", models.CharField(blank=True, max_length=255)),
                ("region", models.CharField(blank=True, help_text="Leave blank for national (all regions).", max_length=120)),
                ("starts_at", models.DateTimeField()),
                ("ends_at", models.DateTimeField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("scheduled", "Scheduled"),
                            ("active", "Active"),
                            ("expired", "Expired"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="scheduled",
                        max_length=16,
                    ),
                ),
                ("priority", models.PositiveSmallIntegerField(default=0)),
                ("label", models.CharField(default="Featured Partner", max_length=64)),
                ("admin_notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="promotion_campaigns_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-priority", "-starts_at"],
                "indexes": [
                    models.Index(fields=["placement", "status", "-starts_at"], name="promotions_p_placeme_idx"),
                    models.Index(fields=["target_type", "target_id"], name="promotions_p_target__idx"),
                ],
            },
        ),
    ]
