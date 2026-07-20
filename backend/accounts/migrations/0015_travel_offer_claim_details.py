from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0014_travel_partner_hub"),
    ]

    operations = [
        migrations.AddField(
            model_name="traveloffer",
            name="details",
            field=models.TextField(
                blank=True,
                help_text="Longer explanation of what this offer includes.",
            ),
        ),
        migrations.AddField(
            model_name="traveloffer",
            name="how_to_claim",
            field=models.TextField(
                blank=True,
                help_text="How travellers sign up or claim this rate / package.",
            ),
        ),
        migrations.AddField(
            model_name="traveloffer",
            name="proof_required",
            field=models.CharField(
                blank=True,
                help_text="What proof is needed, e.g. 'Valid SADC passport at check-in'.",
                max_length=240,
            ),
        ),
        migrations.AddField(
            model_name="traveloffer",
            name="terms_note",
            field=models.TextField(
                blank=True,
                help_text="Optional terms, blackout dates, or fine print.",
            ),
        ),
    ]
