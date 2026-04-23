from django.db import migrations, models


def backfill_media_gallery_from_cover(apps, schema_editor):
    AccommodationListing = apps.get_model("accommodation", "AccommodationListing")
    for row in AccommodationListing.objects.all():
        gallery = []
        if row.cover_image:
            gallery.append({"kind": "image", "src": row.cover_image.name})
        AccommodationListing.objects.filter(pk=row.pk).update(media_gallery=gallery)


class Migration(migrations.Migration):

    dependencies = [
        ("accommodation", "0005_alter_accommodationlisting_property_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="accommodationlisting",
            name="media_gallery",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(backfill_media_gallery_from_cover, migrations.RunPython.noop),
    ]
