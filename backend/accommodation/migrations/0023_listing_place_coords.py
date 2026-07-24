# Generated manually for listing pin truth (lat/lng).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accommodation', '0022_listing_country_code'),
    ]

    operations = [
        migrations.AddField(
            model_name='accommodationlisting',
            name='address',
            field=models.CharField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name='accommodationlisting',
            name='latitude',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name='accommodationlisting',
            name='longitude',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name='accommodationlisting',
            name='google_place_id',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='accommodationlisting',
            name='formatted_address',
            field=models.CharField(blank=True, max_length=500),
        ),
    ]
