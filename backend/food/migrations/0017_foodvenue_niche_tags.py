from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('food', '0016_listing_country_code'),
    ]

    operations = [
        migrations.AddField(
            model_name='foodvenue',
            name='niche_tags',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Long-tail discovery tags, e.g. ["hidden brunch", "locals only"].',
            ),
        ),
    ]
