from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("communities", "0002_groupmessage_image_groupmessage_video_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="groupmembership",
            name="last_read_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
