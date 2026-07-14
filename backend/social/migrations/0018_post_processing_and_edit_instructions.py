# Generated manually for deferred video bake (Phase 2).

from django.db import migrations, models
import config.cloudinary_field_storages


class Migration(migrations.Migration):

    dependencies = [
        ("social", "0017_post_video_trim_end_post_video_trim_start_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="post",
            name="processing_status",
            field=models.CharField(
                choices=[
                    ("ready", "Ready"),
                    ("processing", "Processing"),
                    ("failed", "Failed"),
                ],
                db_index=True,
                default="ready",
                help_text="Video bake status when filters/overlays were applied.",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="post",
            name="processing_error",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="post",
            name="edit_grade",
            field=models.JSONField(
                blank=True,
                help_text="Pending colour grade params to bake asynchronously.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="post",
            name="overlay",
            field=models.ImageField(
                blank=True,
                help_text="Pending overlay PNG to bake asynchronously.",
                null=True,
                storage=config.cloudinary_field_storages.image_field_storage,
                upload_to="posts/overlays/",
            ),
        ),
        migrations.AddField(
            model_name="postmedia",
            name="processing_status",
            field=models.CharField(
                choices=[
                    ("ready", "Ready"),
                    ("processing", "Processing"),
                    ("failed", "Failed"),
                ],
                db_index=True,
                default="ready",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="postmedia",
            name="processing_error",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="postmedia",
            name="edit_grade",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="postmedia",
            name="overlay",
            field=models.ImageField(
                blank=True,
                null=True,
                storage=config.cloudinary_field_storages.image_field_storage,
                upload_to="posts/overlays/",
            ),
        ),
    ]
