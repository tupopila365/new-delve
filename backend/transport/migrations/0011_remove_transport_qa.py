from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("transport", "0010_transport_marketplace_wiring"),
    ]

    operations = [
        migrations.DeleteModel(name="VehicleAnswer"),
        migrations.DeleteModel(name="VehicleQuestion"),
        migrations.DeleteModel(name="BusTripAnswer"),
        migrations.DeleteModel(name="BusTripQuestion"),
    ]
