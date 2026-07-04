from django.db import migrations, models


def backfill_pair_keys(apps, schema_editor):
    Conversation = apps.get_model("messaging", "Conversation")
    for conv in Conversation.objects.all().iterator():
        ids = sorted(conv.participants.values_list("id", flat=True))
        if len(ids) != 2:
            continue
        key = f"{ids[0]}:{ids[1]}"
        # Avoid unique collisions if duplicate threads already exist.
        if Conversation.objects.filter(pair_key=key).exclude(pk=conv.pk).exists():
            continue
        Conversation.objects.filter(pk=conv.pk).update(pair_key=key)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="conversation",
            name="pair_key",
            field=models.CharField(blank=True, db_index=True, max_length=64, null=True, unique=True),
        ),
        migrations.RunPython(backfill_pair_keys, noop_reverse),
    ]
