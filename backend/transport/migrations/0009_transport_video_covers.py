from django.db import migrations, models


def forwards_vehicle_covers(apps, schema_editor):
    Vehicle = apps.get_model("transport", "VehicleRentalListing")
    for row in Vehicle.objects.all().iterator():
        raw = (row.cover_image or "").strip() if row.cover_image is not None else ""
        kind = "image"
        if raw:
            lower = raw.lower().split("?", 1)[0]
            if lower.endswith((".mp4", ".webm", ".mov", ".m4v")) or "/video/" in lower:
                kind = "video"
        Vehicle.objects.filter(pk=row.pk).update(cover_image=raw, cover_kind=kind)


def forwards_bus_covers(apps, schema_editor):
    BusRoute = apps.get_model("transport", "BusRoute")
    for row in BusRoute.objects.all().iterator():
        raw = (row.cover_image or "").strip()
        kind = "image"
        if raw:
            lower = raw.lower().split("?", 1)[0]
            if lower.endswith((".mp4", ".webm", ".mov", ".m4v")) or "/video/" in lower:
                kind = "video"
        if row.cover_kind != kind:
            BusRoute.objects.filter(pk=row.pk).update(cover_kind=kind)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("transport", "0008_transport_reviews_and_ratings"),
    ]

    operations = [
        migrations.AlterField(
            model_name="vehiclerentallisting",
            name="cover_image",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Cover photo or video URL / storage path.",
            ),
        ),
        migrations.AddField(
            model_name="vehiclerentallisting",
            name="cover_kind",
            field=models.CharField(
                choices=[("image", "Image"), ("video", "Video")],
                default="image",
                help_text="Whether cover_image is a still or a short video.",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="busroute",
            name="cover_kind",
            field=models.CharField(
                choices=[("image", "Image"), ("video", "Video")],
                default="image",
                help_text="Whether cover_image is a still or a short video.",
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name="busroute",
            name="cover_image",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Optional coach or route photo/video URL for listings.",
            ),
        ),
        migrations.RunPython(forwards_vehicle_covers, noop),
        migrations.RunPython(forwards_bus_covers, noop),
    ]
