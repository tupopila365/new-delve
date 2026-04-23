from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accommodation", "0007_listing_policies_faq_reviews"),
    ]

    operations = [
        migrations.AddField(
            model_name="accommodationlisting",
            name="room_types",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text=(
                    "Room categories offered by the host, e.g. "
                    '[{"name":"Standard king","description":"…","max_guests":2,'
                    '"bedrooms":1,"bed_summary":"1 king bed","price_per_night":"620.00","image":"https://…"}]'
                ),
            ),
        ),
    ]
