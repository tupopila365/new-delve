# Generated for Phase 2 reports

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Report",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("target_type", models.CharField(choices=[("user", "User profile"), ("post", "Delvers post"), ("comment", "Comment"), ("listing", "Listing"), ("business", "Business"), ("message", "Message"), ("conversation", "Conversation")], max_length=32)),
                ("target_id", models.CharField(max_length=64)),
                ("target_label", models.CharField(blank=True, max_length=255)),
                ("reason", models.CharField(choices=[("spam", "Spam or misleading"), ("harassment", "Harassment or abuse"), ("fake_or_misleading", "Fake or misleading"), ("safety_concern", "Safety concern"), ("inappropriate_content", "Inappropriate content"), ("fraud", "Fraud or scam"), ("other", "Other")], max_length=40)),
                ("description", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("new", "New"), ("under_review", "Under review"), ("escalated", "Escalated"), ("resolved", "Resolved"), ("dismissed", "Dismissed")], default="new", max_length=20)),
                ("severity", models.CharField(choices=[("low", "Low"), ("medium", "Medium"), ("high", "High"), ("critical", "Critical")], default="medium", max_length=16)),
                ("admin_notes", models.TextField(blank=True)),
                ("action_taken", models.CharField(blank=True, choices=[("", "None"), ("dismiss", "Dismissed"), ("warn", "Warning sent"), ("suspend", "User suspended"), ("remove_content", "Content removed"), ("restore_content", "Content restored")], default="", max_length=32)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("reporter", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reports_filed", to=settings.AUTH_USER_MODEL)),
                ("resolved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reports_resolved", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="report",
            index=models.Index(fields=["status", "-created_at"], name="reports_rep_status_8a0b0d_idx"),
        ),
        migrations.AddIndex(
            model_name="report",
            index=models.Index(fields=["target_type", "target_id"], name="reports_rep_target__f8d4c2_idx"),
        ),
    ]
