from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0015_travel_offer_claim_details"),
    ]

    operations = [
        migrations.AddField(
            model_name="traveloffer",
            name="cover_image",
            field=models.TextField(
                blank=True,
                help_text="Hero media URL (image or video) shown on the offer detail page.",
            ),
        ),
        migrations.AddField(
            model_name="traveloffer",
            name="gallery_images",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Extra media items: list of URL strings or {src, kind} objects.",
            ),
        ),
    ]
