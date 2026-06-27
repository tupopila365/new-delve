from django.db import migrations


def assign_event_businesses(apps, schema_editor):
    Event = apps.get_model("events_app", "Event")
    BusinessProfile = apps.get_model("accounts", "BusinessProfile")

    for event in Event.objects.filter(business__isnull=True).iterator():
        businesses = BusinessProfile.objects.filter(owner_id=event.organizer_id).order_by("id")
        chosen = None
        for biz in businesses:
            types = biz.business_types or []
            if "event_organiser" in types or "multi_provider" in types:
                chosen = biz
                break
        if chosen is None:
            chosen = businesses.first()
        if chosen:
            event.business_id = chosen.id
            event.save(update_fields=["business_id"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("events_app", "0003_event_business_engagement"),
    ]

    operations = [
        migrations.RunPython(assign_event_businesses, noop),
    ]
