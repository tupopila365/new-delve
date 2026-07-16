from decimal import Decimal

from django.db import migrations, models


def zero_out_unrated(apps, schema_editor):
    """Existing venues with no reviews carried the old 4.50 default — reset to 0."""
    FoodVenue = apps.get_model("food", "FoodVenue")
    FoodVenue.objects.filter(rating_count=0).update(rating_avg=Decimal("0.00"))


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("food", "0012_remove_food_qa"),
    ]

    operations = [
        migrations.AlterField(
            model_name="foodvenue",
            name="rating_avg",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0.00"),
                help_text="Average visitor rating 0–5 (0 until the venue has reviews).",
                max_digits=3,
            ),
        ),
        migrations.RunPython(zero_out_unrated, noop),
    ]
