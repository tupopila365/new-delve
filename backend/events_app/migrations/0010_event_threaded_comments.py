# Threaded event comments (journey/social Comment shape).

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def migrate_answers_into_threaded_comments(apps, schema_editor):
    EventQuestion = apps.get_model("events_app", "EventQuestion")
    EventAnswer = apps.get_model("events_app", "EventAnswer")

    for answer in EventAnswer.objects.all().iterator():
        EventQuestion.objects.create(
            event_id=answer.question.event_id,
            parent_id=answer.question_id,
            author_id=answer.author_id,
            body=answer.body,
            is_hidden=answer.is_hidden,
            moderation_reason="",
            created_at=answer.created_at,
        )

    EventAnswer.objects.all().delete()

    Event = apps.get_model("events_app", "Event")
    for event in Event.objects.all().iterator():
        count = EventQuestion.objects.filter(
            event_id=event.id,
            is_hidden=False,
            parent__isnull=True,
        ).count()
        if event.comments_count != count:
            Event.objects.filter(pk=event.pk).update(comments_count=count)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("events_app", "0009_event_gallery_images"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="comments_count",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Cached count of top-level visible comments.",
            ),
        ),
        migrations.AlterModelOptions(
            name="eventquestion",
            options={"ordering": ["created_at"]},
        ),
        migrations.AddField(
            model_name="eventquestion",
            name="moderation_reason",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="eventquestion",
            name="parent",
            field=models.ForeignKey(
                blank=True,
                help_text="Top-level comments have no parent; replies reference their parent comment.",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="replies",
                to="events_app.eventquestion",
            ),
        ),
        migrations.CreateModel(
            name="EventQuestionHelpful",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "question",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="helpful_votes",
                        to="events_app.eventquestion",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="helpful_event_question_votes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "unique_together": {("question", "user")},
            },
        ),
        migrations.RunPython(migrate_answers_into_threaded_comments, noop_reverse),
    ]
