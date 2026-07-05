from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("social", "0011_post_fire_reaction"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="comment",
            name="hearted_by_author",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="Post author hearted this comment (creator heart).",
            ),
        ),
        migrations.AddField(
            model_name="comment",
            name="parent",
            field=models.ForeignKey(
                blank=True,
                help_text="Top-level comments have no parent; replies reference their parent comment.",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="replies",
                to="social.comment",
            ),
        ),
        migrations.CreateModel(
            name="CommentDislike",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "comment",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dislike_votes",
                        to="social.comment",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dislike_comment_votes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "unique_together": {("comment", "user")},
            },
        ),
    ]
