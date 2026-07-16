# Generated for guide Delvers moments support.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guides', '0007_guide_qa_reviews'),
        ('social', '0018_post_processing_and_edit_instructions'),
    ]

    operations = [
        migrations.AddField(
            model_name='post',
            name='guide_profile',
            field=models.ForeignKey(blank=True, help_text='Optional link to a tour guide for Delvers moments.', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='delvers_posts', to='guides.tourguideprofile'),
        ),
    ]
