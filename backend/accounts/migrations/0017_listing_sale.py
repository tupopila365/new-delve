# Generated manually for ListingSale (Phase 2)

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("accounts", "0016_travel_offer_media"),
    ]

    operations = [
        migrations.CreateModel(
            name="ListingSale",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "vertical",
                    models.CharField(
                        choices=[
                            ("stays", "Stays"),
                            ("food", "Food"),
                            ("guides", "Guides"),
                            ("transport", "Transport"),
                            ("events", "Events"),
                            ("shop", "Shop"),
                            ("activities", "Activities and Leisure"),
                        ],
                        max_length=20,
                    ),
                ),
                ("listing_id", models.PositiveIntegerField()),
                ("title", models.CharField(default="On sale", max_length=160)),
                (
                    "badge",
                    models.CharField(
                        blank=True,
                        help_text="Short pill, e.g. 'Sale' or '−20%'. Defaults from price fields.",
                        max_length=40,
                    ),
                ),
                (
                    "price_label",
                    models.CharField(
                        blank=True,
                        help_text="Human deal label, e.g. '−20%' or 'From N$800'.",
                        max_length=80,
                    ),
                ),
                ("sale_price", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                (
                    "compare_at_price",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        help_text="Strike-through 'was' price when higher than sale_price.",
                        max_digits=12,
                        null=True,
                    ),
                ),
                (
                    "how_to_claim",
                    models.TextField(blank=True, help_text="How travellers unlock this listing sale."),
                ),
                ("proof_required", models.CharField(blank=True, max_length=240)),
                ("terms_note", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("starts_on", models.DateField(blank=True, null=True)),
                ("ends_on", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="listing_sales",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at", "id"],
            },
        ),
        migrations.AddIndex(
            model_name="listingsale",
            index=models.Index(fields=["vertical", "listing_id", "is_active"], name="listing_sale_lookup_idx"),
        ),
        migrations.AddIndex(
            model_name="listingsale",
            index=models.Index(fields=["owner", "vertical"], name="listing_sale_owner_idx"),
        ),
        migrations.AddConstraint(
            model_name="listingsale",
            constraint=models.UniqueConstraint(
                fields=("vertical", "listing_id"),
                name="listing_sale_vertical_listing_uniq",
            ),
        ),
    ]
