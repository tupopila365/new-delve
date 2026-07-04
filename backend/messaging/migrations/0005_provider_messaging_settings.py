from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("messaging", "0004_messageblock"),
    ]

    operations = [
        migrations.AddField(
            model_name="message",
            name="is_automated",
            field=models.BooleanField(
                default=False,
                help_text="Provider-configured welcome or system message; not typed live by the sender.",
            ),
        ),
        migrations.CreateModel(
            name="ProviderMessagingSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("auto_welcome_enabled", models.BooleanField(default=False)),
                ("auto_welcome_body", models.TextField(blank=True, default="")),
                ("quick_replies_enabled", models.BooleanField(default=False)),
                ("quick_replies", models.JSONField(blank=True, default=list)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="provider_messaging_settings",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "Provider messaging settings",
            },
        ),
    ]
