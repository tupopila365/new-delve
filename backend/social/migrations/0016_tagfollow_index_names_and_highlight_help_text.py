from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("social", "0015_postmedia"),
    ]

    operations = [
        migrations.AlterField(
            model_name="post",
            name="is_delvers_highlight",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="Delvers story highlight — shown in rings only (expires after 24 hours).",
            ),
        ),
    ]
