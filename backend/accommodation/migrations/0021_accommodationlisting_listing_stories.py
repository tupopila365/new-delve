# Generated manually for Sprint 3 stays highlights

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accommodation", "0020_review_seller_reply"),
    ]

    operations = [
        migrations.AddField(
            model_name="accommodationlisting",
            name="listing_stories",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Provider highlight channels for story rings on the stay detail page",
            ),
        ),
    ]
