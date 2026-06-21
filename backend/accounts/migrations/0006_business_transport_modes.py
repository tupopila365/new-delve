from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_provider_onboarding'),
    ]

    operations = [
        migrations.AddField(
            model_name='businessprofile',
            name='transport_modes',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
