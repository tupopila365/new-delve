# Generated migration for PlatformBookingNote

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_admin_audit_log"),
    ]

    operations = [
        migrations.CreateModel(
            name="PlatformBookingNote",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("booking_type", models.CharField(max_length=32)),
                ("booking_id", models.PositiveIntegerField()),
                ("body", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "author",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="booking_admin_notes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["booking_type", "booking_id"], name="accounts_pl_booking_0a8f2d_idx"),
                ],
            },
        ),
    ]
