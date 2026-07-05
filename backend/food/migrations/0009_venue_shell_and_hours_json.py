from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("food", "0008_food_venue_saves"),
    ]

    operations = [
        migrations.AlterField(
            model_name="foodvenue",
            name="region",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AlterField(
            model_name="foodvenue",
            name="is_active",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="foodvenue",
            name="opening_hours_json",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Structured weekly hours: [{"day":"mon","open":true,"opens":"08:00","closes":"17:00"}]',
            ),
        ),
    ]
