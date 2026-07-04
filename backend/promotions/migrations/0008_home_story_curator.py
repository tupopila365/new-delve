import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("promotions", "0007_homepin"),
    ]

    operations = [
        migrations.CreateModel(
            name="HomeStoryChannelConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("channel_id", models.CharField(db_index=True, max_length=20, unique=True)),
                (
                    "auto_fill",
                    models.BooleanField(
                        default=True,
                        help_text="When on, live content fills after editorial slides.",
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="home_story_channels_updated",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["channel_id"],
            },
        ),
        migrations.CreateModel(
            name="HomeStorySlide",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("channel_id", models.CharField(db_index=True, max_length=20)),
                (
                    "source_type",
                    models.CharField(
                        choices=[
                            ("post", "Social post"),
                            ("accommodation", "Stay listing"),
                            ("guide", "Guide profile"),
                            ("food", "Food venue"),
                            ("event", "Event"),
                            ("vehicle", "Vehicle rental"),
                            ("bus_trip", "Bus trip"),
                            ("custom", "Custom media URL"),
                        ],
                        max_length=32,
                    ),
                ),
                ("target_id", models.CharField(blank=True, max_length=64)),
                ("target_label", models.CharField(blank=True, max_length=255)),
                ("headline", models.CharField(blank=True, max_length=200)),
                ("sub", models.CharField(blank=True, max_length=255)),
                ("cta_path", models.CharField(blank=True, max_length=255)),
                ("cta_label", models.CharField(blank=True, max_length=80)),
                (
                    "media_url",
                    models.URLField(
                        blank=True,
                        help_text="Required for custom slides; optional override.",
                        max_length=500,
                    ),
                ),
                (
                    "media_kind",
                    models.CharField(
                        choices=[("image", "Image"), ("video", "Video")],
                        default="image",
                        max_length=10,
                    ),
                ),
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
                        related_name="home_story_slides_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["channel_id", "sort_order", "id"],
                "indexes": [
                    models.Index(fields=["channel_id", "is_active", "sort_order"], name="promotions__channel_7a1b2c_idx"),
                ],
            },
        ),
    ]
