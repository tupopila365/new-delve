from django.db import migrations, models


class Migration(migrations.Migration):
    """Ensure cover_image is unbounded text (Cloudinary video URLs exceed ImageField's 100 chars)."""

    dependencies = [
        ("events_app", "0012_event_cover_media"),
    ]

    operations = [
        migrations.AlterField(
            model_name="event",
            name="cover_image",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Cover photo or video URL / storage path.",
            ),
        ),
    ]
