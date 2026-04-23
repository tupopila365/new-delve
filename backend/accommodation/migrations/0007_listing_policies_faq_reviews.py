from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accommodation", "0006_accommodationlisting_media_gallery"),
    ]

    operations = [
        migrations.AddField(
            model_name="accommodationlisting",
            name="check_in_from",
            field=models.CharField(
                blank=True,
                default="14:00",
                help_text="Earliest check-in (24h clock), e.g. 14:00",
                max_length=12,
            ),
        ),
        migrations.AddField(
            model_name="accommodationlisting",
            name="check_out_until",
            field=models.CharField(
                blank=True,
                default="10:00",
                help_text="Latest check-out (24h clock), e.g. 10:00",
                max_length=12,
            ),
        ),
        migrations.AddField(
            model_name="accommodationlisting",
            name="house_rules",
            field=models.TextField(blank=True, help_text="House rules; one rule per line works well in the app."),
        ),
        migrations.AddField(
            model_name="accommodationlisting",
            name="cancellation_policy",
            field=models.TextField(blank=True, help_text="Cancellation and prepayment summary for guests."),
        ),
        migrations.AddField(
            model_name="accommodationlisting",
            name="faqs",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='FAQ items: [{"question": "...", "answer": "..."}]',
            ),
        ),
        migrations.AddField(
            model_name="accommodationlisting",
            name="guest_reviews",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Snippet reviews: [{"name": "...", "place": "...", "rating": 4.5, "body": "..."}]',
            ),
        ),
    ]
