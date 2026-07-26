# Generated manually for PendingRegistration

import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0018_travel_offer_eligibility_rules"),
    ]

    operations = [
        migrations.CreateModel(
            name="PendingRegistration",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("username", models.CharField(max_length=150, unique=True)),
                ("password_hash", models.CharField(max_length=128)),
                ("birth_year", models.PositiveSmallIntegerField(blank=True, null=True)),
                (
                    "user_type",
                    models.CharField(
                        choices=[("normal", "Normal user"), ("service_provider", "Service provider")],
                        default="normal",
                        max_length=32,
                    ),
                ),
                ("token", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
