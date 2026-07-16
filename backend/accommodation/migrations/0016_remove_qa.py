from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accommodation", "0015_listing_cover_image_text"),
    ]

    operations = [
        migrations.DeleteModel(name="AccommodationAnswer"),
        migrations.DeleteModel(name="AccommodationQuestion"),
    ]
