import django.db.models.deletion
from django.db import migrations, models

import config.cloudinary_field_storages


class Migration(migrations.Migration):

    dependencies = [
        ("social", "0014_tagfollow"),
    ]

    operations = [
        migrations.CreateModel(
            name="PostMedia",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "image",
                    models.ImageField(
                        blank=True,
                        null=True,
                        storage=config.cloudinary_field_storages.image_field_storage,
                        upload_to="posts/",
                    ),
                ),
                (
                    "video",
                    models.FileField(
                        blank=True,
                        null=True,
                        storage=config.cloudinary_field_storages.video_field_storage,
                        upload_to="posts/videos/",
                    ),
                ),
                ("order", models.PositiveIntegerField(db_index=True, default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "post",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="media",
                        to="social.post",
                    ),
                ),
            ],
            options={
                "ordering": ["order", "id"],
            },
        ),
        migrations.AddConstraint(
            model_name="postmedia",
            constraint=models.UniqueConstraint(fields=("post", "order"), name="social_postmedia_unique_order"),
        ),
    ]
