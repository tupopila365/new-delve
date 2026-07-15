# Generated manually for stay cover URL + host fields connectivity.

from django.db import migrations, models


def copy_imagefield_paths(apps, schema_editor):
    Listing = apps.get_model("accommodation", "AccommodationListing")
    for row in Listing.objects.all().iterator():
        raw = row.cover_image
        # After AlterField this is already a string; before, ImageField.name
        if raw is None:
            Listing.objects.filter(pk=row.pk).update(cover_image="")
        elif not isinstance(raw, str):
            name = getattr(raw, "name", "") or ""
            Listing.objects.filter(pk=row.pk).update(cover_image=name)


class Migration(migrations.Migration):
    dependencies = [
        ("accommodation", "0014_phase3_social_trust"),
    ]

    operations = [
        migrations.AlterField(
            model_name="accommodationlisting",
            name="cover_image",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Cover photo URL or /media/ relative path (provider URL-friendly).",
            ),
        ),
        migrations.RunPython(copy_imagefield_paths, migrations.RunPython.noop),
    ]
