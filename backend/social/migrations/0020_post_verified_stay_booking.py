from django.db import migrations, models
import django.db.models.deletion


def backfill_verified_stay_bookings(apps, schema_editor):
    Post = apps.get_model("social", "Post")
    AccommodationBooking = apps.get_model("accommodation", "AccommodationBooking")

    posts = (
        Post.objects.filter(listing_id__isnull=False, is_accommodation_story=False)
        .only("id", "author_id", "listing_id", "created_at")
        .order_by("id")
    )
    for post in posts.iterator():
        booking = (
            AccommodationBooking.objects.filter(
                guest_id=post.author_id,
                listing_id=post.listing_id,
                status="checked_out",
                check_out__lte=post.created_at.date(),
            )
            .order_by("-check_out", "-created_at", "-pk")
            .first()
        )
        if booking is not None:
            Post.objects.filter(pk=post.pk).update(verified_stay_booking_id=booking.pk)
        else:
            # Preserve the post as general Delvers content, but remove the stay
            # association so older unverified links cannot masquerade as Moments.
            Post.objects.filter(pk=post.pk).update(listing_id=None)


class Migration(migrations.Migration):
    dependencies = [
        ("accommodation", "0028_booking_inventory_holds_and_snapshots"),
        ("social", "0019_post_guide_profile_link"),
    ]

    operations = [
        migrations.AddField(
            model_name="post",
            name="verified_stay_booking",
            field=models.ForeignKey(
                blank=True,
                help_text="Checked-out booking that verifies this stay-linked Delvers Moment.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="verified_moments",
                to="accommodation.accommodationbooking",
            ),
        ),
        migrations.RunPython(backfill_verified_stay_bookings, migrations.RunPython.noop),
    ]
