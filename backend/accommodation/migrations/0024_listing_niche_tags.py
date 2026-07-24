from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accommodation', '0023_listing_place_coords'),
    ]

    operations = [
        migrations.AddField(
            model_name='accommodationlisting',
            name='niche_tags',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Long-tail discovery tags, e.g. ["tiny house", "off-grid"].',
            ),
        ),
    ]
