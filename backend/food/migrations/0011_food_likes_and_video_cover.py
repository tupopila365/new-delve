from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def forwards_cover_to_text(apps, schema_editor):
    FoodVenue = apps.get_model("food", "FoodVenue")
    for venue in FoodVenue.objects.all().iterator():
        raw = (venue.cover_image or "").strip() if venue.cover_image is not None else ""
        kind = "image"
        if raw:
            lower = raw.lower().split("?", 1)[0]
            if lower.endswith((".mp4", ".webm", ".mov", ".m4v")) or "/video/" in lower:
                kind = "video"
        FoodVenue.objects.filter(pk=venue.pk).update(
            cover_image=raw,
            cover_kind=kind,
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("food", "0010_venue_geo_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="foodvenue",
            name="cover_image",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Cover photo or video URL / storage path.",
            ),
        ),
        migrations.AddField(
            model_name="foodvenue",
            name="cover_kind",
            field=models.CharField(
                choices=[("image", "Image"), ("video", "Video")],
                default="image",
                help_text="Whether cover_image is a still or a short video.",
                max_length=16,
            ),
        ),
        migrations.RunPython(forwards_cover_to_text, noop_reverse),
        migrations.CreateModel(
            name="FoodVenueLike",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="food_venue_likes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "venue",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="user_likes",
                        to="food.foodvenue",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="foodvenuelike",
            constraint=models.UniqueConstraint(
                fields=("venue", "user"),
                name="food_venue_like_venue_user_uniq",
            ),
        ),
    ]
