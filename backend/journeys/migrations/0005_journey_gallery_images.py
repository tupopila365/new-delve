from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("journeys", "0004_journey_stories"),
    ]

    operations = [
        migrations.AddField(
            model_name="journey",
            name="gallery_images",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Additional hero gallery image URLs (cover is separate).",
            ),
        ),
    ]
