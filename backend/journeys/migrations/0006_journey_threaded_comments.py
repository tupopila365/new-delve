# Generated manually for threaded journey comments (social Comment shape).

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def migrate_answers_into_threaded_comments(apps, schema_editor):
    JourneyQuestion = apps.get_model("journeys", "JourneyQuestion")
    JourneyAnswer = apps.get_model("journeys", "JourneyAnswer")

    for answer in JourneyAnswer.objects.all().iterator():
        JourneyQuestion.objects.create(
            journey_id=answer.question.journey_id,
            parent_id=answer.question_id,
            author_id=answer.author_id,
            body=answer.body,
            is_hidden=answer.is_hidden,
            moderation_reason=answer.moderation_reason or "",
            created_at=answer.created_at,
        )

    JourneyAnswer.objects.all().delete()

    # Recompute comments_count as root comments only.
    Journey = apps.get_model("journeys", "Journey")
    for journey in Journey.objects.all().iterator():
        count = JourneyQuestion.objects.filter(
            journey_id=journey.id,
            is_hidden=False,
            parent__isnull=True,
        ).count()
        if journey.comments_count != count:
            Journey.objects.filter(pk=journey.pk).update(comments_count=count)


def noop_reverse(apps, schema_editor):
    # Answers cannot be perfectly reconstructed once folded into threaded comments.
    pass


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("journeys", "0005_journey_gallery_images"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="journeyquestion",
            options={"ordering": ["created_at"]},
        ),
        migrations.AddField(
            model_name="journeyquestion",
            name="parent",
            field=models.ForeignKey(
                blank=True,
                help_text="Top-level comments have no parent; replies reference their parent comment.",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="replies",
                to="journeys.journeyquestion",
            ),
        ),
        migrations.CreateModel(
            name="JourneyQuestionHelpful",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "question",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="helpful_votes",
                        to="journeys.journeyquestion",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="helpful_journey_question_votes",
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
