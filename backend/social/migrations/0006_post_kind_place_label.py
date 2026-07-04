from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("social", "0005_phase3_social_growth"),
    ]

    operations = [
        migrations.AddField(
            model_name="post",
            name="place_label",
            field=models.CharField(
                blank=True,
                help_text="Free-text place for ask-locals questions, e.g. Windhoek, Namibia.",
                max_length=200,
            ),
        ),
        migrations.AddField(
            model_name="post",
            name="post_kind",
            field=models.CharField(
                choices=[("tip", "Tip"), ("question", "Question")],
                db_index=True,
                default="tip",
                help_text="Community feed: tip or ask-locals question.",
                max_length=16,
            ),
        ),
    ]
