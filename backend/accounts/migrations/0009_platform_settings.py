# Platform intelligence — analytics, settings, notifications, account deletion

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


DEFAULT_FEATURE_FLAGS = {
    "delvers_social": True,
    "new_bookings": True,
    "provider_registration": True,
    "maintenance_mode": False,
}


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0008_platform_booking_note"),
    ]

    operations = [
        migrations.CreateModel(
            name="PlatformSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("singleton_key", models.CharField(default="default", max_length=16, unique=True)),
                ("feature_flags", models.JSONField(blank=True, default=dict)),
                ("announcement_title", models.CharField(blank=True, max_length=200)),
                ("announcement_body", models.TextField(blank=True)),
                ("announcement_active", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="platform_settings_updates",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "Platform settings",
            },
        ),
    ]
