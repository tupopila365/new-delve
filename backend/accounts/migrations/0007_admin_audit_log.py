# Generated manually for Phase 1 platform admin

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_business_transport_modes"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessprofile",
            name="verification_notes",
            field=models.TextField(
                blank=True,
                help_text="Admin notes on verification decision (shown to provider later).",
            ),
        ),
        migrations.CreateModel(
            name="AdminAuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(max_length=64)),
                ("target_type", models.CharField(max_length=32)),
                ("target_id", models.CharField(max_length=64)),
                ("detail", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="admin_audit_actions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
