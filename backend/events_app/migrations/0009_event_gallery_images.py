from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("events_app", "0008_event_stories"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="gallery_images",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Additional hero gallery image URLs (cover is separate).",
            ),
        ),
    ]
