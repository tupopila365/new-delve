from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("food", "0011_food_likes_and_video_cover"),
    ]

    operations = [
        migrations.DeleteModel(name="FoodAnswer"),
        migrations.DeleteModel(name="FoodQuestion"),
    ]
