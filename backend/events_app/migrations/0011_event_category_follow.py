from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("events_app", "0010_event_threaded_comments"),
    ]

    operations = [
        migrations.CreateModel(
            name="EventCategoryFollow",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("music", "Music"),
                            ("sports", "Sports"),
                            ("culture", "Culture"),
                            ("business", "Business"),
                            ("food", "Food & drink"),
                            ("other", "Other"),
                        ],
                        max_length=32,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="event_category_follows",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "unique_together": {("user", "category")},
            },
        ),
        migrations.AddIndex(
            model_name="eventcategoryfollow",
            index=models.Index(fields=["user", "created_at"], name="events_catf_user_created_idx"),
        ),
        migrations.AddIndex(
            model_name="eventcategoryfollow",
            index=models.Index(fields=["category"], name="events_catf_category_idx"),
        ),
    ]
