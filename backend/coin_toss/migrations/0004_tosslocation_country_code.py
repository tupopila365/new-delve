from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('coin_toss', '0003_tosslocationsave'),
    ]

    operations = [
        migrations.AddField(
            model_name='tosslocation',
            name='country_code',
            field=models.CharField(
                blank=True,
                db_index=True,
                default='',
                help_text='ISO 3166-1 alpha-2 for Explore destination scoping.',
                max_length=2,
            ),
        ),
    ]
