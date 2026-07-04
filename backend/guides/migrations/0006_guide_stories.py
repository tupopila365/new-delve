from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("guides", "0005_guide_saves"),
    ]

    operations = [
        migrations.AddField(
            model_name="tourguideprofile",
            name="guide_stories",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Provider highlight channels for story rings",
            ),
        ),
    ]
