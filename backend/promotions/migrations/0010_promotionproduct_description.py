# Generated manually for PromotionProduct.description

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("promotions", "0009_rename_promotions__placeme_home_pin_idx_promotions__placeme_379a6c_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="promotionproduct",
            name="description",
            field=models.CharField(
                blank=True,
                help_text="Short blurb shown on the provider package picker.",
                max_length=255,
            ),
        ),
    ]
