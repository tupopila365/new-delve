# Generated manually for Phase 3 eligibility fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0017_listing_sale"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="birth_year",
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text="Optional birth year for soft deal eligibility (age-gated offers).",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="traveloffer",
            name="min_age",
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text="Minimum traveller age for this offer (inclusive).",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="traveloffer",
            name="max_age",
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text="Maximum traveller age for this offer (inclusive). e.g. 24 → Under 25.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="traveloffer",
            name="min_party_size",
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text="Minimum group / party size required.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="traveloffer",
            name="max_party_size",
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text="Maximum group / party size allowed.",
                null=True,
            ),
        ),
    ]
