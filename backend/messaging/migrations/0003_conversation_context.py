from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0002_conversation_pair_key"),
    ]

    operations = [
        migrations.AddField(
            model_name="conversation",
            name="context_type",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.AddField(
            model_name="conversation",
            name="context_id",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="conversation",
            name="context_label",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
    ]
