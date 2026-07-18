# Rating no longer defaults to a fabricated 4.80; unrated guides sit at 0.00.

from decimal import Decimal

from django.db import migrations, models


def zero_unrated_guides(apps, schema_editor):
    TourGuideProfile = apps.get_model("guides", "TourGuideProfile")
    TourGuideProfile.objects.filter(rating_count=0).update(rating_avg=Decimal("0.00"))


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("guides", "0008_remove_guide_qa"),
    ]

    operations = [
        migrations.AlterField(
            model_name="tourguideprofile",
            name="rating_avg",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0.00"),
                help_text="Average client rating 0–5 (0 until the first review lands).",
                max_digits=3,
            ),
        ),
        migrations.RunPython(zero_unrated_guides, noop),
    ]
