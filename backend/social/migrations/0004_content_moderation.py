# Social content moderation fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("social", "0003_post_accommodation_story"),
    ]

    operations = [
        migrations.AddField(
            model_name="post",
            name="is_hidden",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="post",
            name="moderation_reason",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="comment",
            name="is_hidden",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="comment",
            name="moderation_reason",
            field=models.TextField(blank=True),
        ),
    ]
