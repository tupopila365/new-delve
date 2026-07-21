# Generated manually for shop seller readiness (Sprint A–C, no ID docs)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0008_review_seller_reply"),
    ]

    operations = [
        migrations.AddField(
            model_name="shopprofile",
            name="region",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="shopprofile",
            name="city",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="shopprofile",
            name="fulfillment_notes",
            field=models.CharField(
                blank=True,
                help_text="How buyers get items — pickup spot, shipping areas, lodge drop-off, etc.",
                max_length=400,
            ),
        ),
        migrations.AddField(
            model_name="shopprofile",
            name="phone",
            field=models.CharField(blank=True, max_length=40),
        ),
        migrations.AddField(
            model_name="shopprofile",
            name="phone_verified_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="shopprofile",
            name="payout_method",
            field=models.CharField(
                blank=True,
                choices=[
                    ("bank", "Bank transfer"),
                    ("mobile_money", "Mobile money"),
                    ("other", "Other"),
                ],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="shopprofile",
            name="payout_account_name",
            field=models.CharField(blank=True, max_length=160),
        ),
        migrations.AddField(
            model_name="shopprofile",
            name="payout_account_number",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="shopprofile",
            name="payout_details_set_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
