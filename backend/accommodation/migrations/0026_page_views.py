from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("accommodation", "0025_house_rules_json_list"),
    ]

    operations = [
        migrations.AddField(
            model_name="accommodationlisting",
            name="views_count",
            field=models.PositiveIntegerField(
                db_index=True,
                default=0,
                help_text="Lifetime stay-page views (excludes owner self-views).",
            ),
        ),
        migrations.CreateModel(
            name="AccommodationPageView",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "room_name",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        default="",
                        help_text="Empty = stay listing page. Set = room page view.",
                        max_length=120,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "listing",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="page_views",
                        to="accommodation.accommodationlisting",
                    ),
                ),
                (
                    "viewer",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="accommodation_page_views",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="accommodationpageview",
            index=models.Index(fields=["listing", "created_at"], name="accommodati_listing_4c2e1a_idx"),
        ),
        migrations.AddIndex(
            model_name="accommodationpageview",
            index=models.Index(
                fields=["listing", "room_name", "created_at"],
                name="accommodati_listing_9b7f2c_idx",
            ),
        ),
    ]
