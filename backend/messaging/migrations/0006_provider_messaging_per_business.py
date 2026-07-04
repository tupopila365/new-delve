from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_business_profile"),
        ("messaging", "0005_provider_messaging_settings"),
    ]

    operations = [
        migrations.AddField(
            model_name="providermessagingsettings",
            name="business",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="messaging_settings",
                to="accounts.businessprofile",
            ),
        ),
        migrations.AlterField(
            model_name="providermessagingsettings",
            name="user",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="provider_messaging_settings",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddConstraint(
            model_name="providermessagingsettings",
            constraint=models.UniqueConstraint(
                condition=models.Q(("business__isnull", True)),
                fields=("user",),
                name="uniq_provider_messaging_default_per_user",
            ),
        ),
    ]
