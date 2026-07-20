# Generated manually for Sprint 4 transport highlights

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("transport", "0015_review_seller_reply"),
    ]

    operations = [
        migrations.AddField(
            model_name="vehiclerentallisting",
            name="listing_stories",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Provider highlight channels for story rings on the vehicle detail page",
            ),
        ),
        migrations.AddField(
            model_name="busroute",
            name="listing_stories",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Provider highlight channels for story rings on the bus trip detail page",
            ),
        ),
    ]
