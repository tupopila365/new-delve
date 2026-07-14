from django.db import migrations, models


def forwards_cover_paths(apps, schema_editor):
    Event = apps.get_model("events_app", "Event")
    for event in Event.objects.all().iterator():
        raw = (event.cover_image or "").strip()
        if not raw:
            if event.cover_image is None or event.cover_image != "":
                Event.objects.filter(pk=event.pk).update(cover_image="", cover_kind="image")
            continue
        lower = raw.lower().split("?", 1)[0]
        kind = "video" if lower.endswith((".mp4", ".webm", ".mov", ".m4v")) else "image"
        if event.cover_kind != kind:
            Event.objects.filter(pk=event.pk).update(cover_kind=kind)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("events_app", "0011_event_category_follow"),
    ]

    operations = [
        migrations.AlterField(
            model_name="event",
            name="cover_image",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Cover photo or video URL / storage path.",
            ),
        ),
        migrations.AddField(
            model_name="event",
            name="cover_kind",
            field=models.CharField(
                choices=[("image", "Image"), ("video", "Video")],
                default="image",
                help_text="Whether cover_image is a still or a short video.",
                max_length=16,
            ),
        ),
        migrations.RunPython(forwards_cover_paths, noop_reverse),
    ]
