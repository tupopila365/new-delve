import json

from django.db import migrations, models


def house_rules_text_to_list(apps, schema_editor):
    Listing = apps.get_model("accommodation", "AccommodationListing")
    for obj in Listing.objects.all().iterator():
        raw = obj.house_rules
        if isinstance(raw, list):
            rules = [str(x).strip() for x in raw if str(x).strip()]
        elif not raw:
            rules = []
        else:
            text = str(raw).strip()
            if text.startswith("["):
                try:
                    parsed = json.loads(text)
                    if isinstance(parsed, list):
                        rules = [str(x).strip() for x in parsed if str(x).strip()]
                    else:
                        rules = [text] if text else []
                except (json.JSONDecodeError, TypeError):
                    rules = [line.strip() for line in text.splitlines() if line.strip()]
            else:
                rules = [line.strip() for line in text.splitlines() if line.strip()]
        obj.house_rules = json.dumps(rules)
        obj.save(update_fields=["house_rules"])


def house_rules_list_to_text(apps, schema_editor):
    Listing = apps.get_model("accommodation", "AccommodationListing")
    for obj in Listing.objects.all().iterator():
        raw = obj.house_rules
        if isinstance(raw, list):
            rules = [str(x).strip() for x in raw if str(x).strip()]
        elif not raw:
            rules = []
        else:
            text = str(raw).strip()
            try:
                parsed = json.loads(text)
                rules = (
                    [str(x).strip() for x in parsed if str(x).strip()]
                    if isinstance(parsed, list)
                    else [text]
                )
            except (json.JSONDecodeError, TypeError):
                rules = [line.strip() for line in text.splitlines() if line.strip()]
        obj.house_rules = "\n".join(rules)
        obj.save(update_fields=["house_rules"])


class Migration(migrations.Migration):

    dependencies = [
        ("accommodation", "0024_listing_niche_tags"),
    ]

    operations = [
        migrations.RunPython(house_rules_text_to_list, house_rules_list_to_text),
        migrations.AlterField(
            model_name="accommodationlisting",
            name="house_rules",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='House rules as a list of strings, e.g. ["No smoking", "Quiet hours after 22:00"].',
            ),
        ),
    ]
