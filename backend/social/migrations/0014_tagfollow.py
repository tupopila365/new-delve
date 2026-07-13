from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("social", "0013_per_field_cloudinary_storage"),
        ("tags", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="TagFollow",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "tag",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="followers", to="tags.tag"),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="tag_follows",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "unique_together": {("user", "tag")},
                "indexes": [
                    models.Index(fields=["user", "created_at"], name="social_tagf_user_id_0a7f47_idx"),
                    models.Index(fields=["tag", "created_at"], name="social_tagf_tag_id_0fbd1a_idx"),
                ],
            },
        ),
    ]
