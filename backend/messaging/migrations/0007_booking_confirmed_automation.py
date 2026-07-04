from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0006_provider_messaging_per_business"),
    ]

    operations = [
        migrations.AddField(
            model_name="providermessagingsettings",
            name="booking_confirmed_body",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="providermessagingsettings",
            name="booking_confirmed_enabled",
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name="BookingAutomatedMessageLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("booking_type", models.CharField(max_length=32)),
                ("booking_id", models.PositiveIntegerField()),
                ("trigger", models.CharField(default="confirmed", max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "message",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="booking_automation_logs",
                        to="messaging.message",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="bookingautomatedmessagelog",
            constraint=models.UniqueConstraint(
                fields=("booking_type", "booking_id", "trigger"),
                name="uniq_booking_automated_message",
            ),
        ),
    ]
