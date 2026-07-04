from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("transport", "0007_listing_questions"),
        ("social", "0007_comment_accepted_helpful"),
    ]

    operations = [
        migrations.AddField(
            model_name="post",
            name="bus_trip",
            field=models.ForeignKey(
                blank=True,
                help_text="Optional link to a bus trip for Delvers moments.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="delvers_posts",
                to="transport.bustrip",
            ),
        ),
        migrations.AddField(
            model_name="post",
            name="vehicle_listing",
            field=models.ForeignKey(
                blank=True,
                help_text="Optional link to a vehicle rental for Delvers moments.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="delvers_posts",
                to="transport.vehiclerentallisting",
            ),
        ),
    ]
