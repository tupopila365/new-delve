from django.db import migrations, models


def mark_existing_highlights(apps, schema_editor):
    Post = apps.get_model("social", "Post")
    Post.objects.filter(delvers_board__iexact="Highlights").update(is_delvers_highlight=True)


class Migration(migrations.Migration):

    dependencies = [
        ("social", "0009_post_food_venue_link"),
    ]

    operations = [
        migrations.AddField(
            model_name="post",
            name="is_delvers_highlight",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="Delvers story highlight — shown in rings only, not the pin feed.",
            ),
        ),
        migrations.RunPython(mark_existing_highlights, migrations.RunPython.noop),
    ]
