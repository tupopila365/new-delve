# Remove guide Q&A models (replaced by "From Delvers" moments).

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('guides', '0007_guide_qa_reviews'),
    ]

    operations = [
        migrations.DeleteModel(name='GuideAnswer'),
        migrations.DeleteModel(name='GuideQuestion'),
    ]
