from decimal import Decimal

from django.db import migrations
from django.db.models import F
from django.utils import timezone


def rebuild_verified_stay_ratings(apps, schema_editor):
    Listing = apps.get_model("accommodation", "AccommodationListing")
    Review = apps.get_model("accommodation", "AccommodationReview")
    today = timezone.localdate()

    Listing.objects.update(rating_avg=Decimal("0.00"), rating_count=0)
    for listing in Listing.objects.iterator():
        ratings = list(
            Review.objects.filter(
                listing_id=listing.pk,
                is_hidden=False,
                booking__status="checked_out",
                booking__check_out__lte=today,
                booking__guest_id=F("reviewer_id"),
                booking__listing_id=F("listing_id"),
            ).values_list("rating", flat=True)
        )
        if not ratings:
            continue
        average = Decimal(str(round(sum(float(value) for value in ratings) / len(ratings), 2)))
        Listing.objects.filter(pk=listing.pk).update(
            rating_avg=average,
            rating_count=len(ratings),
        )


class Migration(migrations.Migration):
    dependencies = [
        ("accommodation", "0028_booking_inventory_holds_and_snapshots"),
    ]

    operations = [
        migrations.RunPython(
            rebuild_verified_stay_ratings,
            migrations.RunPython.noop,
        ),
    ]
