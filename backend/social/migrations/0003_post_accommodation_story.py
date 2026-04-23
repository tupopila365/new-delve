import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accommodation", "0004_listing_filters"),
        ("social", "0002_post_video"),
    ]

    operations = [
        migrations.AddField(
            model_name="post",
            name="is_accommodation_story",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="Host/provider story ring on Stays — not mixed into home or Delvers feeds.",
            ),
        ),
        migrations.AddField(
            model_name="post",
            name="listing",
            field=models.ForeignKey(
                blank=True,
                help_text="Optional link to a listing shown from the story CTA.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="story_posts",
                to="accommodation.accommodationlisting",
            ),
        ),
    ]
